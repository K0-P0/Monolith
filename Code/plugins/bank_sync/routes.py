import base64
import socket
import ipaddress
from datetime import datetime
from urllib.parse import urlparse
import requests
from flask import Blueprint, jsonify, request, session
from vault_core import load_mod_data, save_mod_data, mod_auth, log_security, today, json_body

MOD_ID = "bank_sync"
blueprint = Blueprint(MOD_ID, __name__)

def _data(uid): return load_mod_data(uid, MOD_ID)
def _save(uid, d): save_mod_data(uid, MOD_ID, d)

def _is_safe_url(url: str) -> bool:
    try:
        p = urlparse(url)
    except ValueError:
        return False
    if p.scheme != "https" or not p.hostname:
        return False
    try:
        infos = socket.getaddrinfo(p.hostname, p.port or 443, proto=socket.IPPROTO_TCP)
    except (socket.gaierror, UnicodeError):
        return False
    if not infos:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            return False
    return True

def _public(d):
    return {
        "connected":    bool(d.get("access_url")),
        "connected_at": d.get("connected_at"),
        "last_synced":  d.get("last_synced"),
        "accounts":     d.get("accounts", []),
    }

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_public(_data(session["uid"])))

@blueprint.route("/connect", methods=["POST"])
@mod_auth(MOD_ID)
def connect():
    uid   = session["uid"]
    r     = json_body()
    token = r.get("setup_token", "").strip()
    if not token:
        return jsonify({"error": "Setup token required"}), 400
    try:
        claim_url = base64.b64decode(token).decode("utf-8").strip()
    except Exception:
        return jsonify({"error": "Invalid setup token"}), 400
    if not _is_safe_url(claim_url):
        log_security("bank_sync_connect_fail", uid=uid, detail="unsafe_url")
        return jsonify({"error": "Invalid setup token"}), 400
    try:
        resp = requests.post(claim_url, headers={"Content-Length": "0"}, timeout=15)
    except requests.RequestException:
        log_security("bank_sync_connect_fail", uid=uid, detail="network_error")
        return jsonify({"error": "Could not reach SimpleFIN"}), 502
    if resp.status_code != 200 or not resp.text.strip():
        log_security("bank_sync_connect_fail", uid=uid, detail=f"status={resp.status_code}")
        return jsonify({"error": "Setup token was rejected — it may be expired or already used"}), 400
    d = _data(uid)
    d["access_url"]   = resp.text.strip()
    d["connected_at"] = today()
    d.setdefault("accounts", [])
    _save(uid, d)
    log_security("bank_sync_connected", uid=uid)
    return jsonify({"ok": True})

def _merge_accounts(existing, fetched):
    by_id     = {a["id"]: a for a in existing}
    new_count = 0
    for acc in fetched:
        aid       = acc.get("id")
        prev      = by_id.get(aid, {})
        prev_txns = {t["id"]: t for t in prev.get("transactions", [])}
        merged_txns = []
        for t in acc.get("transactions", []):
            tid = t.get("id")
            old = prev_txns.get(tid)
            posted = t.get("posted")
            merged_txns.append({
                "id":       tid,
                "date":     datetime.fromtimestamp(posted).date().isoformat() if posted else "",
                "desc":     t.get("description", ""),
                "amount":   t.get("amount", "0"),
                "pending":  bool(t.get("pending", False)),
                "category": old.get("category", "") if old else "",
                "hidden":   old.get("hidden", False) if old else False,
            })
            if not old:
                new_count += 1
        merged_txns.sort(key=lambda x: x["date"], reverse=True)
        by_id[aid] = {
            "id":           aid,
            "org":          (acc.get("org") or {}).get("name", ""),
            "name":         acc.get("name", ""),
            "currency":     acc.get("currency", "USD"),
            "balance":      acc.get("balance", "0"),
            "transactions": merged_txns,
        }
    return list(by_id.values()), new_count

@blueprint.route("/sync", methods=["POST"])
@mod_auth(MOD_ID)
def sync():
    uid        = session["uid"]
    d          = _data(uid)
    access_url = d.get("access_url")
    if not access_url:
        return jsonify({"error": "Not connected"}), 400
    if not _is_safe_url(access_url):
        log_security("bank_sync_fail", uid=uid, detail="unsafe_url")
        return jsonify({"error": "Stored connection is invalid — reconnect"}), 400
    try:
        resp = requests.get(f"{access_url}/accounts", timeout=20)
    except requests.RequestException:
        log_security("bank_sync_fail", uid=uid, detail="network_error")
        return jsonify({"error": "Could not reach SimpleFIN"}), 502
    if resp.status_code != 200:
        log_security("bank_sync_fail", uid=uid, detail=f"status={resp.status_code}")
        return jsonify({"error": "SimpleFIN returned an error"}), 502
    try:
        payload = resp.json()
    except ValueError:
        return jsonify({"error": "Unexpected response from SimpleFIN"}), 502
    merged, new_count = _merge_accounts(d.get("accounts", []), payload.get("accounts", []))
    d["accounts"]     = merged
    d["last_synced"]  = datetime.now().isoformat()
    _save(uid, d)
    log_security("bank_sync_synced", uid=uid, detail=f"accounts={len(merged)}")
    return jsonify({"ok": True, "accounts": len(merged), "new_transactions": new_count})

@blueprint.route("/transactions/<tid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_transaction(tid):
    uid   = session["uid"]
    r     = json_body()
    d     = _data(uid)
    found = None
    for acc in d.get("accounts", []):
        for t in acc.get("transactions", []):
            if t["id"] == tid:
                if "category" in r: t["category"] = r["category"]
                if "hidden" in r: t["hidden"] = bool(r["hidden"])
                found = t
                break
        if found: break
    if not found:
        return jsonify({"error": "Transaction not found"}), 404
    _save(uid, d)
    return jsonify(found)

@blueprint.route("/disconnect", methods=["DELETE"])
@mod_auth(MOD_ID)
def disconnect():
    uid = session["uid"]
    _save(uid, {})
    log_security("bank_sync_disconnected", uid=uid)
    return jsonify({"ok": True})

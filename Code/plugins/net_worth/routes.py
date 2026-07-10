from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "net_worth"
blueprint = Blueprint(MOD_ID, __name__)

def _load(uid):
    d = load_mod_data(uid, MOD_ID)
    return d.get("assets", []), d.get("liabilities", []), d.get("snapshots", [])

def _save(uid, assets, liabilities, snapshots):
    save_mod_data(uid, MOD_ID, {"assets": assets, "liabilities": liabilities, "snapshots": snapshots})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    uid = session["uid"]
    assets, liabilities, snapshots = _load(uid)
    savings_items = load_mod_data(uid, "savings").get("items", [])
    debt_items    = load_mod_data(uid, "debt_payoff").get("items", [])
    return jsonify({
        "assets":      assets,
        "liabilities": liabilities,
        "snapshots":   snapshots,
        "imported": {
            "savings": savings_items,
            "debts":   debt_items,
        }
    })

@blueprint.route("/asset", methods=["POST"])
@mod_auth(MOD_ID)
def add_asset():
    uid = session["uid"]; r = json_body()
    if not r.get("name","").strip(): return jsonify({"error": "name required"}), 400
    rec = {
        "id":       new_id(),
        "name":     str(r["name"])[:80].strip(),
        "category": str(r.get("category","other"))[:40].strip(),
        "value":    max(0.0, round(float(r.get("value", 0)), 2)),
        "notes":    str(r.get("notes",""))[:200].strip(),
        "created":  today(),
    }
    assets, liabilities, snapshots = _load(uid)
    assets.append(rec); _save(uid, assets, liabilities, snapshots)
    return jsonify(rec), 201

@blueprint.route("/asset/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_asset(rid):
    uid = session["uid"]; r = json_body()
    assets, liabilities, snapshots = _load(uid)
    for item in assets:
        if item["id"] == rid:
            if "name"     in r: item["name"]     = str(r["name"])[:80].strip()
            if "category" in r: item["category"] = str(r["category"])[:40].strip()
            if "value"    in r: item["value"]     = max(0.0, round(float(r["value"]), 2))
            if "notes"    in r: item["notes"]     = str(r["notes"])[:200].strip()
            _save(uid, assets, liabilities, snapshots); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/asset/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_asset(rid):
    uid = session["uid"]
    assets, liabilities, snapshots = _load(uid)
    _save(uid, [a for a in assets if a["id"] != rid], liabilities, snapshots)
    return jsonify({"ok": True})

@blueprint.route("/liability", methods=["POST"])
@mod_auth(MOD_ID)
def add_liability():
    uid = session["uid"]; r = json_body()
    if not r.get("name","").strip(): return jsonify({"error": "name required"}), 400
    rec = {
        "id":       new_id(),
        "name":     str(r["name"])[:80].strip(),
        "category": str(r.get("category","other"))[:40].strip(),
        "value":    max(0.0, round(float(r.get("value", 0)), 2)),
        "notes":    str(r.get("notes",""))[:200].strip(),
        "created":  today(),
    }
    assets, liabilities, snapshots = _load(uid)
    liabilities.append(rec); _save(uid, assets, liabilities, snapshots)
    return jsonify(rec), 201

@blueprint.route("/liability/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_liability(rid):
    uid = session["uid"]; r = json_body()
    assets, liabilities, snapshots = _load(uid)
    for item in liabilities:
        if item["id"] == rid:
            if "name"     in r: item["name"]     = str(r["name"])[:80].strip()
            if "category" in r: item["category"] = str(r["category"])[:40].strip()
            if "value"    in r: item["value"]     = max(0.0, round(float(r["value"]), 2))
            if "notes"    in r: item["notes"]     = str(r["notes"])[:200].strip()
            _save(uid, assets, liabilities, snapshots); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/liability/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_liability(rid):
    uid = session["uid"]
    assets, liabilities, snapshots = _load(uid)
    _save(uid, assets, [l for l in liabilities if l["id"] != rid], snapshots)
    return jsonify({"ok": True})

@blueprint.route("/snapshot", methods=["POST"])
@mod_auth(MOD_ID)
def take_snapshot():
    uid = session["uid"]; r = json_body()
    assets, liabilities, snapshots = _load(uid)
    month = today()[:7]
    snap = {
        "month":       month,
        "net_worth":   round(float(r.get("net_worth", 0)), 2),
        "assets":      round(float(r.get("assets", 0)), 2),
        "liabilities": round(float(r.get("liabilities", 0)), 2),
    }
    snapshots = [s for s in snapshots if s.get("month") != month]
    snapshots.append(snap)
    snapshots.sort(key=lambda s: s["month"])
    if len(snapshots) > 24: snapshots = snapshots[-24:]
    _save(uid, assets, liabilities, snapshots)
    return jsonify(snap)

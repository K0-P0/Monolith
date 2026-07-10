from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "debt_payoff"
blueprint = Blueprint(MOD_ID, __name__)

def _load(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _save(uid, items): save_mod_data(uid, MOD_ID, {"items": items})

def _shape(r, is_new=False):
    rec = {
        "name":          str(r.get("name",""))[:80].strip(),
        "debt_type":     str(r.get("debt_type",""))[:40].strip(),
        "lender":        str(r.get("lender",""))[:60].strip(),
        "balance":       max(0.0, round(float(r.get("balance", 0)), 2)),
        "original":      max(0.0, round(float(r.get("original", r.get("balance", 0))), 2)),
        "min_payment":   max(0.0, round(float(r.get("min_payment", 0)), 2)),
        "extra_payment": max(0.0, round(float(r.get("extra_payment", 0)), 2)),
        "interest_rate": max(0.0, round(float(r.get("interest_rate", 0)), 2)),
        "due_day":       max(1, min(31, int(r.get("due_day", 1)))),
        "strategy":      r.get("strategy") if r.get("strategy") in {"snowball","avalanche","manual"} else "manual",
        "notes":         str(r.get("notes",""))[:250].strip(),
    }
    if is_new:
        rec["id"] = new_id()
        rec["created"] = today()
    return rec

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_load(session["uid"]))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    uid = session["uid"]; r = json_body()
    if not r.get("name"): return jsonify({"error": "name required"}), 400
    rec = _shape(r, is_new=True)
    items = _load(uid); items.append(rec); _save(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    uid = session["uid"]; r = json_body(); items = _load(uid)
    for item in items:
        if item["id"] == rid:
            updates = _shape({**item, **r})
            item.update(updates)
            _save(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session["uid"]
    _save(uid, [i for i in _load(uid) if i["id"] != rid])
    return jsonify({"ok": True})

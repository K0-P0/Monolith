from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "subscriptions"
blueprint = Blueprint(MOD_ID, __name__)

def _d(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _s(uid, v): save_mod_data(uid, MOD_ID, {"items": v})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all(): return jsonify(_d(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session['uid']
    if not r.get("name","").strip() or not r.get("amount"):
        return jsonify({"error": "name and amount required"}), 400
    rec = {"id": new_id(), "name": r["name"].strip(), "amount": float(r["amount"]),
           "cycle": r.get("cycle", "monthly"), "category": r.get("category", "Other"),
           "next_due": r.get("next_due", ""), "active": bool(r.get("active", True)), "created": today()}
    items = _d(uid); items.append(rec); _s(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    r = json_body(); uid = session['uid']; items = _d(uid)
    for item in items:
        if item["id"] == rid:
            for k in ["name","cycle","category","next_due"]:
                if k in r: item[k] = r[k]
            if "amount" in r: item["amount"] = float(r["amount"])
            if "active" in r: item["active"] = bool(r["active"])
            _s(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']; _s(uid, [i for i in _d(uid) if i["id"] != rid])
    return jsonify({"ok": True})

from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "expenses"
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
    if not r.get("desc","").strip() or not r.get("amount"):
        return jsonify({"error": "description and amount required"}), 400
    rec = {"id": new_id(), "desc": r["desc"].strip(), "amount": float(r["amount"]),
           "category": r.get("category", "Other"), "date": r.get("date", today()), "created": today()}
    items = _d(uid); items.append(rec); _s(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']; _s(uid, [i for i in _d(uid) if i["id"] != rid])
    return jsonify({"ok": True})

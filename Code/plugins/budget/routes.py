from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "budget"
blueprint = Blueprint(MOD_ID, __name__)

def _d(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _s(uid, v): save_mod_data(uid, MOD_ID, {"items": v})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all(): return jsonify(_d(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def upsert():
    r = json_body(); uid = session['uid']
    cat = r.get("category","").strip(); limit = float(r.get("limit", 0))
    if not cat or limit <= 0: return jsonify({"error": "category and limit required"}), 400
    items = _d(uid)
    for b in items:
        if b["category"] == cat:
            b["limit"] = limit; _s(uid, items); return jsonify(b)
    rec = {"id": new_id(), "category": cat, "limit": limit}
    items.append(rec); _s(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']; _s(uid, [i for i in _d(uid) if i["id"] != rid])
    return jsonify({"ok": True})

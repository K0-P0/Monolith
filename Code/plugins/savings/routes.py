from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "savings"
blueprint = Blueprint(MOD_ID, __name__)

def _d(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _s(uid, v): save_mod_data(uid, MOD_ID, {"items": v})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_d(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session['uid']
    if not r.get("name", "").strip() or not r.get("target"):
        return jsonify({"error": "name and target required"}), 400
    rec = {
        "id":                 new_id(),
        "name":               r["name"].strip(),
        "savings_type":       r.get("savings_type", "goal"),
        "target":             float(r.get("target", 0)),
        "current":            float(r.get("current", 0)),
        "monthly_contrib":    float(r.get("monthly_contrib", 0)),
        "employer_match_pct": float(r.get("employer_match_pct", 0)),
        "annual_limit":       float(r.get("annual_limit", 0)),
        "ytd_contrib":        float(r.get("ytd_contrib", 0)),
        "target_date":        r.get("target_date", ""),
        "notes":              r.get("notes", "").strip(),
        "created":            today(),
    }
    items = _d(uid); items.append(rec); _s(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    r = json_body(); uid = session['uid']; items = _d(uid)
    for item in items:
        if item["id"] == rid:
            for k in ["name", "savings_type", "target_date", "notes"]:
                if k in r: item[k] = r[k].strip() if isinstance(r[k], str) else r[k]
            for k in ["target", "current", "monthly_contrib", "employer_match_pct", "annual_limit", "ytd_contrib"]:
                if k in r: item[k] = float(r[k])
            _s(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']
    _s(uid, [i for i in _d(uid) if i["id"] != rid])
    return jsonify({"ok": True})

@blueprint.route("/<rid>/add", methods=["POST"])
@mod_auth(MOD_ID)
def add_balance(rid):
    r = json_body(); uid = session['uid']; items = _d(uid)
    amount = float(r.get("amount", 0))
    for item in items:
        if item["id"] == rid:
            item["current"] = round(max(0.0, float(item.get("current", 0)) + amount), 2)
            if amount > 0 and r.get("add_ytd", False):
                item["ytd_contrib"] = round(float(item.get("ytd_contrib", 0)) + amount, 2)
            _s(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

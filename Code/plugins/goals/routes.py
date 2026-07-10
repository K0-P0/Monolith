from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "goals"
blueprint = Blueprint(MOD_ID, __name__)

def _d(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _s(uid, v): save_mod_data(uid, MOD_ID, {"items": v})

def _f(v, default=0.0):
    try: return float(v)
    except (TypeError, ValueError): return default

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_d(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session['uid']
    if not r.get("name", "").strip():
        return jsonify({"error": "name required"}), 400
    if "start" in r:
        start = _f(r["start"])
    elif r.get("goal_type", "save") == "payoff":
        start = _f(r.get("current", 0))
    else:
        start = 0.0
    rec = {
        "id":           new_id(),
        "name":         r["name"].strip(),
        "goal_type":    r.get("goal_type", "save"),
        "target":       _f(r.get("target", 0)),
        "current":      _f(r.get("current", 0)),
        "start":        start,
        "monthly_pace": _f(r.get("monthly_pace", 0)),
        "target_date":  r.get("target_date", ""),
        "notes":        r.get("notes", "").strip(),
        "created":      today(),
    }
    items = _d(uid); items.append(rec); _s(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    r = json_body(); uid = session['uid']; items = _d(uid)
    for item in items:
        if item["id"] == rid:
            for k in ["name", "goal_type", "target_date", "notes"]:
                if k in r: item[k] = r[k].strip() if isinstance(r[k], str) else r[k]
            for k in ["target", "current", "start", "monthly_pace"]:
                if k in r: item[k] = _f(r[k])
            _s(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']
    _s(uid, [i for i in _d(uid) if i["id"] != rid])
    return jsonify({"ok": True})

@blueprint.route("/<rid>/progress", methods=["POST"])
@mod_auth(MOD_ID)
def set_progress(rid):
    r = json_body(); uid = session['uid']; items = _d(uid)
    for item in items:
        if item["id"] == rid:
            item["current"] = round(_f(r.get("value", item.get("current", 0))), 2)
            _s(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

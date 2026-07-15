from flask import jsonify, session
from vault_core import (crud_blueprint, load_mod_data, save_mod_data,
                        mod_auth, json_body, safe_float)

MOD_ID = "goals"

def _on_create(rec, body):
    if "start" not in body:
        rec["start"] = rec["current"] if rec.get("goal_type") == "payoff" else 0.0

blueprint = crud_blueprint(MOD_ID, fields={
    "name":         ("str",   ""),
    "goal_type":    ("str",   "save"),
    "target":       ("float", 0.0),
    "current":      ("float", 0.0),
    "start":        ("float", 0.0),
    "monthly_pace": ("float", 0.0),
    "target_date":  ("str",   ""),
    "notes":        ("str",   ""),
}, required=("name",), on_create=_on_create)

def _items(uid):
    return load_mod_data(uid, MOD_ID).get("items", [])

@blueprint.route("/<rid>/progress", methods=["POST"])
@mod_auth(MOD_ID)
def set_progress(rid):
    r = json_body(); uid = session["uid"]; items = _items(uid)
    for item in items:
        if item["id"] == rid:
            item["current"] = round(safe_float(r.get("value", item.get("current", 0))), 2)
            save_mod_data(uid, MOD_ID, {"items": items})
            return jsonify(item)
    return jsonify({"error": "not found"}), 404

def bridge_events(uid, year, month):
    prefix = f"{year:04d}-{month:02d}"
    return [{
        "date":   g["target_date"],
        "label":  f"Goal target — {g.get('name', '')}",
        "amount": safe_float(g.get("target")),
        "type":   "deadline",
        "color":  "#a87cff",
        "icon":   "🎯",
    } for g in _items(uid) if str(g.get("target_date", "")).startswith(prefix)]

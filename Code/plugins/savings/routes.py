from flask import jsonify, session
from vault_core import (crud_blueprint, load_mod_data, save_mod_data,
                        mod_auth, json_body, safe_float)

MOD_ID = "savings"

blueprint = crud_blueprint(MOD_ID, fields={
    "name":               ("str",   ""),
    "savings_type":       ("str",   "goal"),
    "target":             ("float", 0.0),
    "current":            ("float", 0.0),
    "monthly_contrib":    ("float", 0.0),
    "employer_match_pct": ("float", 0.0),
    "annual_limit":       ("float", 0.0),
    "ytd_contrib":        ("float", 0.0),
    "target_date":        ("str",   ""),
    "notes":              ("str",   ""),
}, required=("name", "target"))

def _items(uid):
    return load_mod_data(uid, MOD_ID).get("items", [])

@blueprint.route("/<rid>/add", methods=["POST"])
@mod_auth(MOD_ID)
def add_balance(rid):
    r = json_body(); uid = session["uid"]; items = _items(uid)
    amount = safe_float(r.get("amount"))
    for item in items:
        if item["id"] == rid:
            item["current"] = round(max(0.0, safe_float(item.get("current")) + amount), 2)
            if amount > 0 and r.get("add_ytd", False):
                item["ytd_contrib"] = round(safe_float(item.get("ytd_contrib")) + amount, 2)
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
        "color":  "#5ab4ff",
        "icon":   "🏦",
    } for g in _items(uid) if str(g.get("target_date", "")).startswith(prefix)]

def bridge_balances(uid):
    return [{
        "kind":            "savings",
        "name":            g.get("name", ""),
        "amount":          safe_float(g.get("current")),
        "monthly_contrib": safe_float(g.get("monthly_contrib")),
        "category":        g.get("savings_type", "goal"),
    } for g in _items(uid)]

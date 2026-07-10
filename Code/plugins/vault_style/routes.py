from vault_core import load_mod_data, save_mod_data, mod_auth, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "vault_style"
blueprint = Blueprint(MOD_ID, __name__)

VALID_THEMES = {
    "amber", "vanguard", "cyberpunk", "synthwave", "deep_ocean",
    "military", "arctic", "crimson", "void", "copper", "forest",
    "independence", "sunset"
}

def _load(uid): return load_mod_data(uid, MOD_ID)
def _save(uid, d): save_mod_data(uid, MOD_ID, d)

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_prefs():
    return jsonify(_load(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def set_theme():
    r = json_body()
    theme = r.get("theme", "amber").strip()
    if theme not in VALID_THEMES:
        return jsonify({"error": f"Unknown theme. Valid: {', '.join(sorted(VALID_THEMES))}"}), 400
    prefs = _load(session['uid'])
    prefs["theme"] = theme
    _save(session['uid'], prefs)
    return jsonify({"ok": True, "theme": theme})

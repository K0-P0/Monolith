from vault_core import load_mod_data, mod_auth
from flask import Blueprint, jsonify, session

MOD_ID = "calendar_view"
blueprint = Blueprint(MOD_ID, __name__)

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_data():
    uid = session['uid']
    return jsonify({
        "subscriptions": load_mod_data(uid, "subscriptions").get("items", []),
        "bills":         load_mod_data(uid, "bills").get("items", []),
        "sources":       load_mod_data(uid, "paycheck_pro").get("sources", []),
    })

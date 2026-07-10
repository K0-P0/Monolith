from vault_core import mod_auth
from vault_bridge import get_income_picture, get_expense_picture, get_financial_health
from flask import Blueprint, jsonify, session

MOD_ID = "reports"
blueprint = Blueprint(MOD_ID, __name__)

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_data():
    uid = session['uid']
    return jsonify({
        "income":  get_income_picture(uid),
        "expense": get_expense_picture(uid),
        "health":  get_financial_health(uid),
    })

from datetime import date
from flask import Blueprint, jsonify, request, session
from vault_core import mod_auth
from vault_bridge import get_calendar_events

MOD_ID = "calendar_view"
blueprint = Blueprint(MOD_ID, __name__)

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_month():
    now = date.today()
    try:
        year  = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))
    except ValueError:
        return jsonify({"error": "year and month must be integers"}), 400
    if not (1 <= month <= 12 and 1970 <= year <= 2200):
        return jsonify({"error": "year or month out of range"}), 400
    return jsonify({
        "year":   year,
        "month":  month,
        "events": get_calendar_events(session["uid"], year, month),
    })

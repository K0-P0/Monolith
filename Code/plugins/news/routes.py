from datetime import date, timedelta
from flask import Blueprint, jsonify, session
from vault_core import mod_auth
from vault_bridge import get_calendar_events

MOD_ID    = "news"
blueprint = Blueprint(MOD_ID, __name__)

WINDOW_DAYS = 60

def _upcoming(uid: str) -> list:
    today = date.today()
    cutoff = (today + timedelta(days=WINDOW_DAYS)).isoformat()
    events = []
    y, m = today.year, today.month
    for _ in range(3):
        events += get_calendar_events(uid, y, m)
        m += 1
        if m > 12: m = 1; y += 1
    events = [e for e in events if today.isoformat() <= e["date"] <= cutoff]
    events.sort(key=lambda e: e["date"])
    return events

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    events = _upcoming(session["uid"])
    total  = sum(e["amount"] for e in events if e["type"] == "payment")
    return jsonify({
        "events":        events,
        "total_upcoming": round(total, 2),
        "count":         len(events),
    })

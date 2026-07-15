from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "garage"
blueprint = Blueprint(MOD_ID, __name__)

def _s(v): return str(v).strip() if v not in (None, "") else ""
def _i(v, default=0):
    try: return int(float(v)) if v not in (None, "") else default
    except: return default
def _f(v, default=0.0):
    try: return float(v) if v not in (None, "") else default
    except: return default

def _norm(v):
    logs = sorted(v.get("logs", []), key=lambda x: x.get("date",""), reverse=True)
    return {
        "id":               _s(v.get("id")) or new_id(),
        "year":             _i(v.get("year")),
        "make":             _s(v.get("make")),
        "model":            _s(v.get("model")),
        "trim":             _s(v.get("trim")),
        "nickname":         _s(v.get("nickname")),
        "vin":              _s(v.get("vin")),
        "plate":            _s(v.get("plate")),
        "insurance":        _s(v.get("insurance")),
        "registration_due": _s(v.get("registration_due")),
        "purchase_date":    _s(v.get("purchase_date")),
        "current_mileage":  _i(v.get("current_mileage")),
        "notes":            _s(v.get("notes")),
        "created":          _s(v.get("created")) or today(),
        "updated":          _s(v.get("updated")) or today(),
        "logs":             logs,
    }

def _load(uid):
    raw = load_mod_data(uid, MOD_ID) or {}
    return {"vehicles": [_norm(v) for v in raw.get("vehicles", []) if isinstance(v, dict)]}

def _save(uid, data):
    save_mod_data(uid, MOD_ID, {"vehicles": data.get("vehicles", [])})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_load(session["uid"]))

@blueprint.route("/vehicle", methods=["POST"])
@mod_auth(MOD_ID)
def add_vehicle():
    r = json_body(); uid = session["uid"]
    if not _s(r.get("make")) or not _s(r.get("model")):
        return jsonify({"error": "Make and model required"}), 400
    data = _load(uid)
    v = _norm(r); v["id"] = new_id(); v["created"] = today(); v["logs"] = []
    data["vehicles"].append(v); _save(uid, data)
    return jsonify(v), 201

@blueprint.route("/vehicle/<vid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_vehicle(vid):
    r = json_body(); uid = session["uid"]; data = _load(uid)
    for v in data["vehicles"]:
        if v["id"] == vid:
            for k in ["make","model","trim","nickname","vin","plate","insurance","registration_due","purchase_date","notes"]:
                if k in r: v[k] = _s(r[k])
            if "year" in r: v["year"] = _i(r["year"])
            if "current_mileage" in r: v["current_mileage"] = _i(r["current_mileage"])
            v["updated"] = today()
            _save(uid, data); return jsonify(v)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/vehicle/<vid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_vehicle(vid):
    uid = session["uid"]; data = _load(uid)
    data["vehicles"] = [v for v in data["vehicles"] if v["id"] != vid]
    _save(uid, data); return jsonify({"ok": True})

@blueprint.route("/vehicle/<vid>/service", methods=["POST"])
@mod_auth(MOD_ID)
def add_service(vid):
    r = json_body(); uid = session["uid"]; data = _load(uid)
    v = next((x for x in data["vehicles"] if x["id"] == vid), None)
    if not v: return jsonify({"error": "Vehicle not found"}), 404
    svc = {
        "id":      new_id(),
        "service": _s(r.get("service")),
        "date":    _s(r.get("date")) or today(),
        "mileage": _i(r.get("mileage")),
        "cost":    _f(r.get("cost")),
        "vendor":  _s(r.get("vendor")),
        "notes":   _s(r.get("notes")),
        "created": today(),
    }
    v["logs"].insert(0, svc)
    if svc["mileage"] > v["current_mileage"]:
        v["current_mileage"] = svc["mileage"]
    v["updated"] = today()
    _save(uid, data); return jsonify(svc), 201

@blueprint.route("/vehicle/<vid>/service/<sid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_service(vid, sid):
    uid = session["uid"]; data = _load(uid)
    v = next((x for x in data["vehicles"] if x["id"] == vid), None)
    if not v: return jsonify({"error": "Vehicle not found"}), 404
    v["logs"] = [l for l in v["logs"] if l["id"] != sid]
    v["updated"] = today()
    _save(uid, data); return jsonify({"ok": True})

def _display_name(v):
    return v.get("nickname") or " ".join(
        str(p) for p in (v.get("year") or "", v.get("make", ""), v.get("model", "")) if p
    ).strip() or "Vehicle"

def bridge_events(uid, year, month):
    prefix = f"{year:04d}-{month:02d}"
    return [{
        "date":   v["registration_due"],
        "label":  f"{_display_name(v)} — Registration renewal",
        "amount": 0,
        "type":   "reminder",
        "color":  "#fb923c",
        "icon":   "📄",
    } for v in _load(uid)["vehicles"]
        if str(v.get("registration_due", "")).startswith(prefix)]

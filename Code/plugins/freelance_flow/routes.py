from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "freelance_flow"
blueprint = Blueprint(MOD_ID, __name__)

STATUSES = {"Lead", "In Progress", "Invoiced", "Partial", "Paid", "Archived"}

def _load(uid): return load_mod_data(uid, MOD_ID).get("jobs", [])
def _save(uid, jobs): save_mod_data(uid, MOD_ID, {"jobs": jobs})

def _num(v, default=0.0):
    try: return float(v) if v not in (None, "") else float(default)
    except (TypeError, ValueError): return float(default)

def _net(job):
    return max(0.0, _num(job.get("amount_received")) - _num(job.get("expenses")) - _num(job.get("tax_set_aside")))

def _shape(r, existing=None):
    base = existing.copy() if existing else {}
    if "title"          in r: base["title"]           = str(r["title"]).strip()
    if "client"         in r: base["client"]           = str(r.get("client","")).strip()
    if "status"         in r: base["status"]           = r["status"] if r["status"] in STATUSES else base.get("status","Lead")
    if "notes"          in r: base["notes"]            = str(r.get("notes","")).strip()
    if "invoice_date"   in r: base["invoice_date"]     = str(r.get("invoice_date",""))
    if "due_date"       in r: base["due_date"]         = str(r.get("due_date",""))
    if "paid_date"      in r: base["paid_date"]        = str(r.get("paid_date",""))
    for k in ["quote_amount","amount_received","expenses","tax_set_aside"]:
        if k in r: base[k] = _num(r[k])
    return base

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_load(session["uid"]))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session["uid"]
    if not r.get("title"): return jsonify({"error": "Job title required"}), 400
    rec = _shape(r)
    rec.update({"id": new_id(), "created": today()})
    if "status" not in rec: rec["status"] = "Lead"
    jobs = _load(uid); jobs.append(rec); _save(uid, jobs)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    r = json_body(); uid = session["uid"]; jobs = _load(uid)
    for job in jobs:
        if job["id"] == rid:
            job.update(_shape(r, existing=job))
            _save(uid, jobs); return jsonify(job)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session["uid"]
    _save(uid, [j for j in _load(uid) if j["id"] != rid])
    return jsonify({"ok": True})

@blueprint.route("/<rid>/mark_paid", methods=["POST"])
@mod_auth(MOD_ID)
def mark_paid(rid):
    r = json_body(); uid = session["uid"]; jobs = _load(uid)
    for job in jobs:
        if job["id"] == rid:
            amt = _num(r.get("amount_received"), job.get("quote_amount"))
            job["amount_received"] = amt
            job["paid_date"] = r.get("paid_date") or today()
            job["status"] = "Paid" if amt >= _num(job.get("quote_amount")) else "Partial"
            _save(uid, jobs); return jsonify(job)
    return jsonify({"error": "not found"}), 404

from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "tax_prep"
blueprint = Blueprint(MOD_ID, __name__)

CHECKLIST_KEYS = {
    "w2", "f1099", "deductions_reviewed", "quarterlies_paid",
    "filed_federal", "filed_state", "outcome_recorded",
}

def _d(uid):
    d = load_mod_data(uid, MOD_ID)
    return {
        "deductions": d.get("deductions", []),
        "payments":   d.get("payments", []),
        "checklist":  d.get("checklist", {}),
    }

def _s(uid, v): save_mod_data(uid, MOD_ID, v)

def _f(v, default=0.0):
    try: return float(v)
    except (TypeError, ValueError): return default

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_d(session['uid']))

@blueprint.route("/deduction", methods=["POST"])
@mod_auth(MOD_ID)
def add_deduction():
    r = json_body(); uid = session['uid']
    amount = _f(r.get("amount"))
    if amount <= 0:
        return jsonify({"error": "amount required"}), 400
    rec = {
        "id":       new_id(),
        "date":     r.get("date") or today(),
        "category": r.get("category", "other").strip(),
        "label":    r.get("label", "").strip(),
        "amount":   round(amount, 2),
        "notes":    r.get("notes", "").strip(),
    }
    d = _d(uid); d["deductions"].append(rec); _s(uid, d)
    return jsonify(rec), 201

@blueprint.route("/deduction/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_deduction(rid):
    r = json_body(); uid = session['uid']; d = _d(uid)
    for item in d["deductions"]:
        if item["id"] == rid:
            for k in ["date", "category", "label", "notes"]:
                if k in r: item[k] = str(r[k]).strip()
            if "amount" in r: item["amount"] = round(_f(r["amount"]), 2)
            _s(uid, d); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/deduction/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_deduction(rid):
    uid = session['uid']; d = _d(uid)
    d["deductions"] = [i for i in d["deductions"] if i["id"] != rid]
    _s(uid, d)
    return jsonify({"ok": True})

@blueprint.route("/payment", methods=["POST"])
@mod_auth(MOD_ID)
def add_payment():
    r = json_body(); uid = session['uid']
    amount = _f(r.get("amount"))
    if amount <= 0:
        return jsonify({"error": "amount required"}), 400
    rec = {
        "id":        new_id(),
        "quarter":   r.get("quarter", "").strip(),
        "amount":    round(amount, 2),
        "date_paid": r.get("date_paid") or today(),
        "notes":     r.get("notes", "").strip(),
    }
    d = _d(uid); d["payments"].append(rec); _s(uid, d)
    return jsonify(rec), 201

@blueprint.route("/payment/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_payment(rid):
    uid = session['uid']; d = _d(uid)
    d["payments"] = [i for i in d["payments"] if i["id"] != rid]
    _s(uid, d)
    return jsonify({"ok": True})

@blueprint.route("/checklist", methods=["POST"])
@mod_auth(MOD_ID)
def set_checklist():
    r = json_body(); uid = session['uid']
    key = r.get("key", "")
    if key not in CHECKLIST_KEYS:
        return jsonify({"error": "unknown checklist item"}), 400
    d = _d(uid)
    d["checklist"][key] = bool(r.get("done", False))
    _s(uid, d)
    return jsonify(d["checklist"])

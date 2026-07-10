from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "ot_vault"
blueprint = Blueprint(MOD_ID, __name__)

def _calc(r):
    hrs = float(r.get("hours", 0)); rate = float(r.get("rate", 0))
    mult = float(r.get("multiplier", 1.5)); tax = float(r.get("tax_rate", 17))
    gross = hrs * (rate * mult); tax_amt = gross * (tax / 100)
    return {"gross": round(gross,2), "tax_amt": round(tax_amt,2), "net": round(gross-tax_amt,2)}

def _load(uid): return load_mod_data(uid, MOD_ID).get("items", [])
def _save(uid, v): save_mod_data(uid, MOD_ID, {"items": v})

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all(): return jsonify(_load(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session['uid']
    if not r.get("hours"): return jsonify({"error": "Hours required"}), 400
    rec = {"id": new_id(), "date": r.get("date", today()), "hours": float(r["hours"]),
           "rate": float(r.get("rate",0)), "multiplier": float(r.get("multiplier",1.5)),
           "tax_rate": float(r.get("tax_rate",17)), "notes": r.get("notes","").strip(),
           "created": today(), **_calc(r)}
    items = _load(uid); items.append(rec); _save(uid, items)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update(rid):
    r = json_body(); uid = session['uid']
    items = _load(uid)
    for item in items:
        if item["id"] == rid:
            for k in ["date", "notes"]:
                if k in r: item[k] = str(r[k]).strip()
            for k in ["hours", "rate", "multiplier", "tax_rate"]:
                if k in r: item[k] = float(r[k])
            item.update(_calc(item))
            _save(uid, items); return jsonify(item)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete(rid):
    uid = session['uid']
    _save(uid, [i for i in _load(uid) if i["id"] != rid])
    return jsonify({"ok": True})

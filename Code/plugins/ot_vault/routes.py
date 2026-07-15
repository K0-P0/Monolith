from vault_core import crud_blueprint, load_mod_data, safe_float, today

MOD_ID = "ot_vault"

def _calc(r):
    hrs = safe_float(r.get("hours")); rate = safe_float(r.get("rate"))
    mult = safe_float(r.get("multiplier"), 1.5); tax = safe_float(r.get("tax_rate"), 17)
    gross = hrs * (rate * mult); tax_amt = gross * (tax / 100)
    return {"gross": round(gross, 2), "tax_amt": round(tax_amt, 2), "net": round(gross - tax_amt, 2)}

def _recalc(rec, body):
    rec.update(_calc(rec))

blueprint = crud_blueprint(MOD_ID, fields={
    "date":       ("str",   today),
    "hours":      ("float", 0.0),
    "rate":       ("float", 0.0),
    "multiplier": ("float", 1.5),
    "tax_rate":   ("float", 17.0),
    "notes":      ("str",   ""),
}, required=("hours",), on_create=_recalc, on_update=_recalc)

def bridge_income(uid):
    month_key = today()[:7]
    out = []
    for entry in load_mod_data(uid, MOD_ID).get("items", []):
        if not str(entry.get("date", "")).startswith(month_key):
            continue
        net = safe_float(entry.get("net"))
        out.append({
            "name":      f"OT — {entry.get('date', '')}",
            "net":       net,
            "gross":     safe_float(entry.get("gross", net)),
            "monthly":   net,
            "frequency": "one_time",
            "type":      "supplemental",
            "date":      entry.get("date", ""),
        })
    return out

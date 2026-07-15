from vault_core import crud_blueprint, load_mod_data, safe_float, today

MOD_ID = "expenses"

blueprint = crud_blueprint(MOD_ID, fields={
    "desc":     ("str",   ""),
    "amount":   ("float", 0.0),
    "category": ("str",   "Other"),
    "date":     ("str",   today),
}, required=("desc", "amount"))

def bridge_expenses(uid):
    month_key = today()[:7]
    return [{
        "name":     e.get("desc", e.get("name", "")),
        "amount":   safe_float(e.get("amount")),
        "category": e.get("category", "Other"),
        "date":     e.get("date", ""),
        "type":     "variable",
    } for e in load_mod_data(uid, MOD_ID).get("items", [])
        if str(e.get("date", "")).startswith(month_key)]

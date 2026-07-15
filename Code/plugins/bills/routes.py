from vault_core import crud_blueprint, load_mod_data, month_day_date, safe_float

MOD_ID = "bills"

blueprint = crud_blueprint(MOD_ID, fields={
    "name":     ("str",   ""),
    "amount":   ("float", 0.0),
    "due_day":  ("day",   1),
    "category": ("str",   "Other"),
    "autopay":  ("bool",  False),
    "notes":    ("str",   ""),
}, required=("name", "amount"))

def _items(uid):
    return load_mod_data(uid, MOD_ID).get("items", [])

def bridge_expenses(uid):
    return [{
        "name":     b.get("name", ""),
        "amount":   safe_float(b.get("amount")),
        "category": b.get("category", "Other"),
        "date":     "",
        "type":     "fixed",
    } for b in _items(uid)]

def bridge_events(uid, year, month):
    out = []
    for b in _items(uid):
        d = month_day_date(year, month, b.get("due_day"))
        if d:
            out.append({"date": d, "label": b.get("name", "Bill"),
                        "amount": safe_float(b.get("amount")),
                        "type": "payment", "color": "#f0a000", "icon": "📋"})
    return out

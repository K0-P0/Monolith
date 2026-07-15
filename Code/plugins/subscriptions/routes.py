from vault_core import crud_blueprint, load_mod_data, monthly_amount, safe_float

MOD_ID = "subscriptions"

blueprint = crud_blueprint(MOD_ID, fields={
    "name":     ("str",   ""),
    "amount":   ("float", 0.0),
    "cycle":    ("str",   "monthly"),
    "category": ("str",   "Other"),
    "next_due": ("str",   ""),
    "active":   ("bool",  True),
}, required=("name", "amount"))

def _items(uid):
    return load_mod_data(uid, MOD_ID).get("items", [])

def bridge_expenses(uid):
    return [{
        "name":     sub.get("name", ""),
        "amount":   round(monthly_amount(sub.get("amount"), sub.get("cycle", "monthly"),
                                         default_mult=1.0), 2),
        "category": sub.get("category", "Other"),
        "date":     sub.get("next_due", ""),
        "type":     "recurring",
    } for sub in _items(uid) if sub.get("active", True)]

def bridge_events(uid, year, month):
    prefix = f"{year:04d}-{month:02d}"
    return [{
        "date":   sub["next_due"],
        "label":  sub.get("name", "Subscription"),
        "amount": safe_float(sub.get("amount")),
        "type":   "payment",
        "color":  "#e05252",
        "icon":   "🔄",
    } for sub in _items(uid)
        if sub.get("active", True) and str(sub.get("next_due", "")).startswith(prefix)]

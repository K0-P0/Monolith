from vault_core import (crud_blueprint, load_mod_data, month_day_date,
                        safe_float, str_max, choice)

MOD_ID = "debt_payoff"

def _on_create(rec, body):
    if "original" not in body:
        rec["original"] = rec["balance"]

blueprint = crud_blueprint(MOD_ID, fields={
    "name":          (str_max(80),  ""),
    "debt_type":     (str_max(40),  ""),
    "lender":        (str_max(60),  ""),
    "balance":       ("money",      0.0),
    "original":      ("money",      0.0),
    "min_payment":   ("money",      0.0),
    "extra_payment": ("money",      0.0),
    "interest_rate": ("money",      0.0),
    "due_day":       ("day",        1),
    "strategy":      (choice({"snowball", "avalanche", "manual"}, "manual"), "manual"),
    "notes":         (str_max(250), ""),
}, required=("name",), on_create=_on_create)

def _items(uid):
    return load_mod_data(uid, MOD_ID).get("items", [])

def bridge_expenses(uid):
    return [{
        "name":     f"{d.get('name', 'Debt')} (min payment)",
        "amount":   safe_float(d.get("min_payment")),
        "category": "Debt",
        "date":     "",
        "type":     "fixed",
    } for d in _items(uid) if safe_float(d.get("min_payment")) > 0]

def bridge_events(uid, year, month):
    out = []
    for debt in _items(uid):
        d = month_day_date(year, month, debt.get("due_day"))
        if d:
            out.append({"date": d, "label": f"{debt.get('name', 'Debt')} payment",
                        "amount": safe_float(debt.get("min_payment")),
                        "type": "payment", "color": "#fb923c", "icon": "💳"})
    return out

def bridge_balances(uid):
    return [{
        "kind":     "debt",
        "name":     d.get("name", "Debt"),
        "amount":   safe_float(d.get("balance")),
        "category": d.get("debt_type", ""),
    } for d in _items(uid)]

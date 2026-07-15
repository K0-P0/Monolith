from datetime import date, timedelta

from vault_core import disabled_mod_ids, safe_float

HOOK_NAMES = ("bridge_income", "bridge_expenses", "bridge_events", "bridge_balances")

_PROVIDERS = {}

def register_provider_module(mod_id: str, display_name: str, module) -> int:
    hooks = {h: getattr(module, h) for h in HOOK_NAMES
             if callable(getattr(module, h, None))}
    if hooks:
        _PROVIDERS[mod_id] = {"name": display_name, "hooks": hooks}
    return len(hooks)

def registered_providers() -> dict:
    return {mid: sorted(p["hooks"]) for mid, p in _PROVIDERS.items()}

def _collect(uid: str, hook: str, *args, off=None) -> list:
    if off is None:
        off = disabled_mod_ids(uid)
    out = []
    for mid, p in _PROVIDERS.items():
        fn = p["hooks"].get(hook)
        if not fn or mid in off:
            continue
        try:
            items = fn(uid, *args) or []
        except Exception as e:
            print(f"  [bridge] {mid}.{hook} failed: {e}")
            continue
        for it in items:
            it.setdefault("mod_id", mid)
            it.setdefault("mod_name", p["name"])
            out.append(it)
    return out

def get_income_picture(uid: str, off=None) -> dict:
    sources = _collect(uid, "bridge_income", off=off)
    monthly_total = sum(safe_float(s.get("monthly")) for s in sources)
    by_type = {}
    for s in sources:
        t = s.get("type", "supplemental")
        by_type[t] = by_type.get(t, 0) + safe_float(s.get("monthly"))
    return {
        "monthly_total": round(monthly_total, 2),
        "sources":       sources,
        "by_type":       {k: round(v, 2) for k, v in by_type.items()},
    }

def get_expense_picture(uid: str, off=None) -> dict:
    items = _collect(uid, "bridge_expenses", off=off)
    monthly_total = sum(safe_float(i.get("amount")) for i in items)
    by_category, by_mod = {}, {}
    for i in items:
        amt = safe_float(i.get("amount"))
        cat = i.get("category", "Other")
        by_category[cat]      = round(by_category.get(cat, 0) + amt, 2)
        by_mod[i["mod_id"]]   = round(by_mod.get(i["mod_id"], 0) + amt, 2)
    return {
        "monthly_total":  round(monthly_total, 2),
        "fixed_total":    round(sum(safe_float(i.get("amount")) for i in items
                                    if i.get("type") in ("fixed", "recurring")), 2),
        "variable_total": round(sum(safe_float(i.get("amount")) for i in items
                                    if i.get("type") == "variable"), 2),
        "items":          items,
        "by_category":    by_category,
        "by_mod":         by_mod,
    }

_EVENT_ORDER = {"income": 0, "payment": 1, "deadline": 2, "reminder": 3}

def get_calendar_events(uid: str, year: int, month: int, off=None) -> list:
    events = _collect(uid, "bridge_events", year, month, off=off)
    events.sort(key=lambda e: (e.get("date", ""), _EVENT_ORDER.get(e.get("type"), 9)))
    return events

def get_balance_items(uid: str, off=None) -> list:
    return _collect(uid, "bridge_balances", off=off)

def get_balances(uid: str, off=None) -> dict:
    items = get_balance_items(uid, off=off)
    def tot(kind):
        return round(sum(safe_float(i.get("amount")) for i in items
                         if i.get("kind") == kind), 2)
    return {
        "savings_total":           tot("savings"),
        "savings_monthly_contrib": round(sum(safe_float(i.get("monthly_contrib"))
                                             for i in items if i.get("kind") == "savings"), 2),
        "savings_count":           sum(1 for i in items if i.get("kind") == "savings"),
        "debt_total":              tot("debt"),
        "asset_total":             tot("asset"),
        "liability_total":         tot("liability"),
    }

def get_financial_health(uid: str, off=None, _income=None, _expense=None, _balances=None) -> dict:
    if off is None:
        off = disabled_mod_ids(uid)
    income_data  = _income  or get_income_picture(uid, off=off)
    expense_data = _expense or get_expense_picture(uid, off=off)
    balances     = _balances or get_balances(uid, off=off)

    monthly_income   = income_data["monthly_total"]
    monthly_expenses = expense_data["monthly_total"]
    net              = monthly_income - monthly_expenses

    monthly_savings = balances["savings_monthly_contrib"]
    savings_rate    = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0

    total_debt = balances["debt_total"]
    dti        = (total_debt / (monthly_income * 12) * 100) if monthly_income > 0 else 0

    expense_ratio = (monthly_expenses / monthly_income * 100) if monthly_income > 0 else 100

    score = int(
        min(40, savings_rate / 20 * 40) +
        max(0, 30 - min(30, dti / 100 * 30)) +
        max(0, 30 - max(0, (expense_ratio - 70) / 30 * 30))
    )

    grade    = next(g for s, g in [(90,'A'),(80,'B'),(70,'C'),(60,'D'),(0,'F')] if score >= s)
    insights = []

    if monthly_income == 0:
        insights.append("No income sources found. Add one in Paycheck Pro.")
    else:
        if savings_rate < 10:
            insights.append(f"Savings rate is {savings_rate:.0f}% — aim for at least 20%.")
        elif savings_rate >= 20:
            insights.append(f"Strong savings rate at {savings_rate:.0f}%.")
        if expense_ratio > 90:
            insights.append(f"Expenses consume {expense_ratio:.0f}% of income — very tight margin.")
        elif expense_ratio > 70:
            insights.append(f"Expenses at {expense_ratio:.0f}% of income — some room to reduce.")
        if total_debt > monthly_income * 12:
            insights.append("Total debt is over one year's income. Focus on payoff.")
        if net < 0:
            insights.append("Spending exceeds income this month.")
        elif net > 0 and savings_rate == 0:
            insights.append(f"{monthly_income - monthly_expenses:.0f} available — consider setting a savings goal.")

    return {
        "score":             score,
        "grade":             grade,
        "monthly_income":    round(monthly_income, 2),
        "monthly_expenses":  round(monthly_expenses, 2),
        "net":               round(net, 2),
        "savings_rate_pct":  round(savings_rate, 1),
        "expense_ratio_pct": round(expense_ratio, 1),
        "total_debt":        round(total_debt, 2),
        "debt_to_income":    round(dti, 1),
        "insights":          insights,
    }

UPCOMING_DAYS = 35

def get_summary(uid: str) -> dict:
    off     = disabled_mod_ids(uid)
    income  = get_income_picture(uid, off=off)
    expense = get_expense_picture(uid, off=off)
    balances = get_balances(uid, off=off)
    health  = get_financial_health(uid, off=off, _income=income,
                                   _expense=expense, _balances=balances)

    today_d = date.today()
    horizon = today_d + timedelta(days=UPCOMING_DAYS)
    events  = []
    y, m = today_d.year, today_d.month
    for _ in range(2):
        events += get_calendar_events(uid, y, m, off=off)
        m += 1
        if m > 12: m = 1; y += 1
    upcoming = []
    for e in events:
        try:
            days = (date.fromisoformat(e.get("date", "")) - today_d).days
        except ValueError:
            continue
        if 0 <= days <= UPCOMING_DAYS and e.get("date") <= horizon.isoformat():
            e["days"] = days
            upcoming.append(e)

    return {
        "today":    today_d.isoformat(),
        "income":   income,
        "expense":  expense,
        "health":   health,
        "balances": balances,
        "upcoming": upcoming,
    }

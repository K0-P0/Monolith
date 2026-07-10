from vault_core import load_mod_data
from datetime import date

def _today_str():
    return date.today().isoformat()

def _safe_float(v, default=0.0):
    try: return float(v or 0)
    except (TypeError, ValueError): return default

def _period_to_monthly(amount, frequency):
    multipliers = {
        "weekly":      52 / 12,
        "biweekly":    26 / 12,
        "semimonthly": 24 / 12,
        "monthly":     1,
        "annual":      1 / 12,
        "one_time":    0,
    }
    return amount * multipliers.get(frequency, 0)

def get_income_picture(uid: str) -> dict:
    sources   = []
    month_key = _today_str()[:7]

    pp_data = load_mod_data(uid, "paycheck_pro")
    for src in pp_data.get("sources", []):
        net  = _safe_float(src.get("net", src.get("net_direct", 0)))
        freq = src.get("frequency", "biweekly")
        sources.append({
            "mod_id":    "paycheck_pro",
            "mod_name":  "Paycheck Pro",
            "name":      src.get("name", "Paycheck"),
            "net":       net,
            "gross":     _safe_float(src.get("gross", net)),
            "monthly":   _period_to_monthly(net, freq),
            "frequency": freq,
            "type":      "primary",
            "date":      src.get("last_paid", ""),
        })

    actual_this_month = [h for h in pp_data.get("history", []) if h.get("date", "").startswith(month_key)]
    if actual_this_month:
        actual_total = sum(_safe_float(h.get("actual", 0)) for h in actual_this_month)
        for s in sources:
            if s["mod_id"] == "paycheck_pro":
                s["monthly"] = 0
        sources.append({
            "mod_id":    "paycheck_pro",
            "mod_name":  "Paycheck Pro (Actual)",
            "name":      "Logged Paychecks",
            "net":       actual_total,
            "gross":     actual_total,
            "monthly":   actual_total,
            "frequency": "actual",
            "type":      "primary",
            "date":      _today_str(),
        })

    for entry in load_mod_data(uid, "ot_vault").get("items", []):
        if not entry.get("date", "").startswith(month_key): continue
        net = _safe_float(entry.get("net", 0))
        sources.append({
            "mod_id":    "ot_vault",
            "mod_name":  "OT Vault",
            "name":      f"OT — {entry.get('date', '')}",
            "net":       net,
            "gross":     _safe_float(entry.get("gross", net)),
            "monthly":   net,
            "frequency": "one_time",
            "type":      "supplemental",
            "date":      entry.get("date", ""),
        })

    for entry in load_mod_data(uid, "freelance_flow").get("payouts", []):
        if not entry.get("date", "").startswith(month_key): continue
        net = _safe_float(entry.get("net", entry.get("amount", 0)))
        sources.append({
            "mod_id":    "freelance_flow",
            "mod_name":  "Freelance Flow",
            "name":      entry.get("client", "Freelance"),
            "net":       net,
            "gross":     _safe_float(entry.get("gross", net)),
            "monthly":   net,
            "frequency": "one_time",
            "type":      "supplemental",
            "date":      entry.get("date", ""),
        })

    monthly_total = sum(s["monthly"] for s in sources)
    by_type = {}
    for s in sources:
        by_type[s["type"]] = by_type.get(s["type"], 0) + s["monthly"]

    return {
        "monthly_total": round(monthly_total, 2),
        "sources":       sources,
        "by_type":       {k: round(v, 2) for k, v in by_type.items()},
    }

def get_expense_picture(uid: str) -> dict:
    items     = []
    month_key = _today_str()[:7]

    cycle_to_monthly = {"weekly": 52/12, "monthly": 1, "annual": 1/12}
    for sub in load_mod_data(uid, "subscriptions").get("items", []):
        if not sub.get("active", True): continue
        mo = _safe_float(sub.get("amount", 0)) * cycle_to_monthly.get(sub.get("cycle", "monthly"), 1)
        items.append({
            "mod_id":   "subscriptions",
            "mod_name": "Subscriptions",
            "name":     sub.get("name", ""),
            "amount":   round(mo, 2),
            "category": sub.get("category", "Other"),
            "date":     sub.get("next_due", ""),
            "type":     "recurring",
        })

    for bill in load_mod_data(uid, "bills").get("items", []):
        items.append({
            "mod_id":   "bills",
            "mod_name": "Bills",
            "name":     bill.get("name", ""),
            "amount":   _safe_float(bill.get("amount", 0)),
            "category": bill.get("category", "Other"),
            "date":     "",
            "type":     "fixed",
        })

    for exp in load_mod_data(uid, "expenses").get("items", []):
        if not exp.get("date", "").startswith(month_key): continue
        items.append({
            "mod_id":   "expenses",
            "mod_name": "Expenses",
            "name":     exp.get("desc", exp.get("name", "")),
            "amount":   _safe_float(exp.get("amount", 0)),
            "category": exp.get("category", "Other"),
            "date":     exp.get("date", ""),
            "type":     "variable",
        })

    for debt in load_mod_data(uid, "debt_payoff").get("items", []):
        min_pay = _safe_float(debt.get("min_payment", 0))
        if min_pay <= 0: continue
        items.append({
            "mod_id":   "debt_payoff",
            "mod_name": "Debt Payoff",
            "name":     f"{debt.get('name', 'Debt')} (min payment)",
            "amount":   min_pay,
            "category": "Debt",
            "date":     "",
            "type":     "fixed",
        })

    monthly_total = sum(i["amount"] for i in items)
    by_category   = {}
    by_mod        = {}
    for i in items:
        by_category[i["category"]] = round(by_category.get(i["category"], 0) + i["amount"], 2)
        by_mod[i["mod_id"]]        = round(by_mod.get(i["mod_id"], 0) + i["amount"], 2)

    return {
        "monthly_total":  round(monthly_total, 2),
        "fixed_total":    round(sum(i["amount"] for i in items if i["type"] in ("fixed", "recurring")), 2),
        "variable_total": round(sum(i["amount"] for i in items if i["type"] == "variable"), 2),
        "items":          items,
        "by_category":    by_category,
        "by_mod":         by_mod,
    }

def get_calendar_events(uid: str, year: int, month: int) -> list:
    events = []
    pad_m  = str(month).zfill(2)
    prefix = f"{year}-{pad_m}"

    def in_month(d):
        return isinstance(d, str) and d.startswith(prefix)

    def next_bill_date(due_day):
        import calendar
        try:
            day = min(int(due_day), calendar.monthrange(year, month)[1])
            return f"{year}-{pad_m}-{str(day).zfill(2)}"
        except (ValueError, TypeError):
            return None

    def next_payday(last_paid, frequency):
        from datetime import date, timedelta
        gaps = {"weekly":7,"biweekly":14,"semimonthly":15,"monthly":30,"annual":365}
        gap  = gaps.get(frequency, 14)
        if not last_paid: return []
        try: d = date.fromisoformat(last_paid)
        except ValueError: return []
        target_month = date(year, month, 1)
        while d < target_month:
            d += timedelta(days=gap)
        paydays = []
        while d.year == year and d.month == month:
            paydays.append(d.isoformat())
            d += timedelta(days=gap)
        return paydays

    for sub in load_mod_data(uid, "subscriptions").get("items", []):
        if not sub.get("active", True): continue
        due = sub.get("next_due", "")
        if in_month(due):
            events.append({"mod_id":"subscriptions","mod_name":"Subscriptions","date":due,
                           "label":sub.get("name","Subscription"),"amount":_safe_float(sub.get("amount",0)),
                           "type":"payment","color":"#e05252","icon":"🔄"})

    for bill in load_mod_data(uid, "bills").get("items", []):
        d = next_bill_date(bill.get("due_day"))
        if d:
            events.append({"mod_id":"bills","mod_name":"Bills","date":d,
                           "label":bill.get("name","Bill"),"amount":_safe_float(bill.get("amount",0)),
                           "type":"payment","color":"#f0a000","icon":"📋"})

    pp_data = load_mod_data(uid, "paycheck_pro")
    for src in pp_data.get("sources", []):
        for pd in next_payday(src.get("last_paid"), src.get("frequency", "biweekly")):
            events.append({"mod_id":"paycheck_pro","mod_name":"Paycheck Pro","date":pd,
                           "label":f"Payday — {src.get('name','')}","amount":_safe_float(src.get("net",0)),
                           "type":"income","color":"#38c872","icon":"💵"})

    for debt in load_mod_data(uid, "debt_payoff").get("items", []):
        d = next_bill_date(debt.get("due_day"))
        if d:
            events.append({"mod_id":"debt_payoff","mod_name":"Debt Payoff","date":d,
                           "label":f"{debt.get('name','Debt')} payment","amount":_safe_float(debt.get("min_payment",0)),
                           "type":"payment","color":"#fb923c","icon":"💳"})

    for goal in load_mod_data(uid, "savings").get("items", []):
        td = goal.get("target_date", "")
        if in_month(td):
            events.append({"mod_id":"savings","mod_name":"Savings","date":td,
                           "label":f"Goal target — {goal.get('name','')}","amount":_safe_float(goal.get("target",0)),
                           "type":"deadline","color":"#5ab4ff","icon":"🏦"})

    for v in load_mod_data(uid, "garage").get("items", []):
        for field, label, icon, color in [
            ("insurance_renewal",    "Insurance renewal",    "🛡️",  "#a87cff"),
            ("registration_renewal", "Registration renewal", "📄", "#fb923c"),
        ]:
            d = v.get(field, "")
            if in_month(d):
                events.append({"mod_id":"garage","mod_name":"Garage","date":d,
                               "label":f"{v.get('name','Vehicle')} — {label}","amount":0,
                               "type":"reminder","color":color,"icon":icon})

    type_order = {"income":0,"payment":1,"deadline":2,"reminder":3}
    events.sort(key=lambda e: (e["date"], type_order.get(e["type"], 9)))
    return events

def get_financial_health(uid: str) -> dict:
    income_data  = get_income_picture(uid)
    expense_data = get_expense_picture(uid)

    monthly_income   = income_data["monthly_total"]
    monthly_expenses = expense_data["monthly_total"]
    net              = monthly_income - monthly_expenses

    savings_data    = load_mod_data(uid, "savings").get("items", [])
    monthly_savings = sum(_safe_float(g.get("monthly_contrib", 0)) for g in savings_data)
    savings_rate    = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0

    debt_data  = load_mod_data(uid, "debt_payoff").get("items", [])
    total_debt = sum(_safe_float(d.get("balance", 0)) for d in debt_data)
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

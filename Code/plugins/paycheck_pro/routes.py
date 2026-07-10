from datetime import date, datetime, timedelta

from vault_core import load_mod_data, save_mod_data, mod_auth, new_id, today, json_body
from flask import Blueprint, jsonify, request, session

MOD_ID = "paycheck_pro"
blueprint = Blueprint(MOD_ID, __name__)

PERIODS = {"weekly": 52, "biweekly": 26, "semimonthly": 24, "monthly": 12, "annual": 1}

PAY_GAP = {"weekly": 7, "biweekly": 14, "semimonthly": 15, "monthly": 30, "annual": 365}
PROJECT_DAYS = 60
IMPORT_MAX_ENTRIES = 200
MATCH_WINDOW_DAYS = 5
LEARN_LAST_N = 3

def _calc(r):
    t = r.get("income_type", "hourly")
    freq = r.get("frequency", "biweekly")
    if t == "hourly":
        gross = float(r.get("hourly_rate", 0)) * float(r.get("hours_per_period", 0))
    elif t == "salary":
        gross = float(r.get("annual_salary", 0)) / PERIODS.get(freq, 26)
    else:
        net = float(r.get("net_direct", 0))
        return {"gross": net, "k401_amount": 0.0, "tax_amount": 0.0, "net": round(net, 2)}
    k401t = r.get("k401_type", "percent")
    k401v = float(r.get("k401_value", 0))
    k401a = max(0.0, gross * k401v / 100 if k401t == "percent" else min(k401v, gross))
    taxa  = max(0.0, (gross - k401a) * float(r.get("tax_rate", 0)) / 100)
    return {
        "gross":       round(gross, 2),
        "k401_amount": round(k401a, 2),
        "tax_amount":  round(taxa, 2),
        "net":         round(max(0, gross - k401a - taxa), 2),
    }

def _load(uid):    return load_mod_data(uid, MOD_ID)
def _save(uid, d): save_mod_data(uid, MOD_ID, d)
def _sources(uid): return _load(uid).get("sources", [])
def _history(uid): return _load(uid).get("history", [])

def _settings(d):
    s = d.get("settings", {})
    return {"enable_paycheck_estimations": bool(s.get("enable_paycheck_estimations", False))}

def _status(h):
    return h.get("status", "verified")

def _set(h, k, v):
    if h.get(k) != v:
        h[k] = v
        return True
    return False

def _learned(history, src):
    floor = src.get("calc_updated", "")
    checks = sorted((h for h in history
                     if _status(h) == "verified"
                     and h.get("source_id") == src["id"]
                     and float(h.get("actual") or 0) > 0
                     and h.get("date", "") >= floor),
                    key=lambda h: h.get("date", ""))[-LEARN_LAST_N:]
    if not checks:
        return None
    def avg(key):
        vals = [float(h[key]) for h in checks
                if isinstance(h.get(key), (int, float)) and float(h[key]) > 0]
        return round(sum(vals) / len(vals), 2) if vals else None
    return {"net": round(sum(float(h["actual"]) for h in checks) / len(checks), 2),
            "gross": avg("gross"), "taxes": avg("taxes")}

def _sync_estimates(d):
    sources = d.get("sources", [])
    history = d.get("history", [])
    today_d = date.today()
    horizon = today_d + timedelta(days=PROJECT_DAYS)
    wanted, est_by_sid = {}, {}
    for s in sources:
        learned = _learned(history, s)
        est = {
            "net":   learned["net"] if learned else round(float(s.get("net", 0)), 2),
            "gross": (learned["gross"] if learned and learned["gross"] is not None
                      else round(float(s.get("gross", 0)), 2)),
            "taxes": (learned["taxes"] if learned and learned["taxes"] is not None
                      else round(float(s.get("tax_amount", 0)), 2)),
        }
        if not s.get("last_paid") or est["net"] <= 0:
            continue
        try:
            dt = date.fromisoformat(str(s["last_paid"])[:10])
        except ValueError:
            continue
        est_by_sid[s["id"]] = est
        gap = timedelta(days=PAY_GAP.get(s.get("frequency", "biweekly"), 14))
        while dt <= today_d:
            dt += gap
        while dt <= horizon:
            wanted[(s["id"], dt.isoformat())] = s
            dt += gap
    verified_dates = {}
    for h in history:
        if _status(h) == "verified" and h.get("source_id") and h.get("date"):
            try:
                verified_dates.setdefault(h["source_id"], []).append(
                    date.fromisoformat(h["date"]))
            except ValueError:
                pass
    def _covered(sid, dt):
        return any(abs((v - dt).days) <= MATCH_WINDOW_DAYS
                   for v in verified_dates.get(sid, []))
    wanted = {(sid, iso): s for (sid, iso), s in wanted.items()
              if not _covered(sid, date.fromisoformat(iso))}
    src_ids = {s["id"] for s in sources}
    changed, kept = False, []
    for h in history:
        if _status(h) != "estimated":
            kept.append(h)
            continue
        key = (h.get("source_id"), h.get("date"))
        if key in wanted:
            s = wanted.pop(key)
            est = est_by_sid[s["id"]]
            for k, v in (("source_name", s.get("name", "")), ("expected", est["net"]),
                         ("actual", est["net"]), ("difference", 0.0),
                         ("gross", est["gross"]), ("taxes", est["taxes"])):
                changed = _set(h, k, v) or changed
            kept.append(h)
        elif (h.get("date", "") <= today_d.isoformat()
              and h.get("source_id") in src_ids
              and not _covered(h.get("source_id"),
                               date.fromisoformat(h["date"]))):
            kept.append(h)
        else:
            changed = True
    for (sid, iso), s in sorted(wanted.items(), key=lambda kv: kv[0][1]):
        est = est_by_sid[sid]
        kept.append({
            "id": new_id(), "source_id": sid, "source_name": s.get("name", ""),
            "date": iso, "expected": est["net"], "actual": est["net"],
            "difference": 0.0, "gross": est["gross"], "taxes": est["taxes"],
            "notes": "", "created": today(),
            "status": "estimated", "source_file": "",
        })
        changed = True
    d["history"] = kept
    return changed

@blueprint.route("/", methods=["GET"])
@mod_auth(MOD_ID)
def get_all():
    return jsonify(_sources(session['uid']))

@blueprint.route("/", methods=["POST"])
@mod_auth(MOD_ID)
def add():
    r = json_body(); uid = session['uid']
    name = r.get("name", "").strip()
    if not name: return jsonify({"error": "Name required"}), 400
    rec = {
        "id": new_id(), "name": name,
        "income_type":      r.get("income_type", "hourly"),
        "hourly_rate":      float(r.get("hourly_rate", 0)),
        "hours_per_period": float(r.get("hours_per_period", 0)),
        "annual_salary":    float(r.get("annual_salary", 0)),
        "k401_type":        r.get("k401_type", "percent"),
        "k401_value":       float(r.get("k401_value", 0)),
        "tax_rate":         float(r.get("tax_rate", 0)),
        "net_direct":       float(r.get("net_direct", 0)),
        "frequency":        r.get("frequency", "biweekly"),
        "last_paid":        r.get("last_paid", ""),
        "notes":            r.get("notes", "").strip(),
        "created":          today(),
        **_calc(r),
    }
    sources = _sources(uid); sources.append(rec)
    d = _load(uid); d["sources"] = sources; _save(uid, d)
    return jsonify(rec), 201

@blueprint.route("/<rid>", methods=["PUT"])
@mod_auth(MOD_ID)
def update_source(rid):
    r = json_body(); uid = session['uid']
    d = _load(uid); sources = d.get("sources", [])
    for src in sources:
        if src["id"] == rid:
            for k in ["name","income_type","k401_type","frequency","last_paid","notes"]:
                if k in r: src[k] = r[k]
            for k in ["hourly_rate","hours_per_period","annual_salary","k401_value","tax_rate","net_direct"]:
                if k in r: src[k] = float(r[k])
            old_net = src.get("net")
            src.update(_calc(src))
            if src["net"] != old_net:
                src["calc_updated"] = today()
            d["sources"] = sources; _save(uid, d)
            return jsonify(src)
    return jsonify({"error": "not found"}), 404

@blueprint.route("/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_source(rid):
    uid = session['uid']
    d = _load(uid)
    d["sources"] = [s for s in d.get("sources", []) if s["id"] != rid]
    _save(uid, d)
    return jsonify({"ok": True})

@blueprint.route("/settings", methods=["GET"])
@mod_auth(MOD_ID)
def get_settings():
    return jsonify(_settings(_load(session['uid'])))

@blueprint.route("/settings", methods=["PUT"])
@mod_auth(MOD_ID)
def put_settings():
    r = request.get_json(silent=True) or {}
    uid = session['uid']
    d = _load(uid)
    d["settings"] = {"enable_paycheck_estimations":
                     bool(r.get("enable_paycheck_estimations", False))}
    _save(uid, d)
    return jsonify(_settings(d))

@blueprint.route("/history", methods=["GET"])
@mod_auth(MOD_ID)
def get_history():
    uid = session['uid']
    d = _load(uid)
    if _settings(d)["enable_paycheck_estimations"]:
        if _sync_estimates(d):
            _save(uid, d)
        return jsonify(d.get("history", []))
    return jsonify([h for h in d.get("history", []) if _status(h) == "verified"])

@blueprint.route("/history", methods=["POST"])
@mod_auth(MOD_ID)
def log_paycheck():
    r = json_body(); uid = session['uid']
    actual = float(r.get("actual", 0))
    if actual <= 0: return jsonify({"error": "Actual amount required"}), 400
    rec = {
        "id":          new_id(),
        "source_id":   r.get("source_id", ""),
        "source_name": r.get("source_name", "Manual Entry"),
        "date":        r.get("date", today()),
        "expected":    round(float(r.get("expected", 0)), 2),
        "actual":      round(actual, 2),
        "difference":  round(actual - float(r.get("expected", 0)), 2),
        "notes":       r.get("notes", "").strip(),
        "created":     today(),
        "status":      "verified",
        "source_file": "",
    }
    history = _history(uid); history.append(rec)
    d = _load(uid); d["history"] = history; _save(uid, d)
    return jsonify(rec), 201

@blueprint.route("/history/<rid>", methods=["DELETE"])
@mod_auth(MOD_ID)
def delete_history(rid):
    uid = session['uid']
    d = _load(uid)
    d["history"] = [h for h in d.get("history", []) if h["id"] != rid]
    _save(uid, d)
    return jsonify({"ok": True})

def _pick(e, *keys):
    for k in keys:
        v = e.get(k)
        if v not in (None, ""):
            return v
    return None

def _num(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace("$", "").replace(",", "").strip())
        except ValueError:
            return None
    return None

def _tax_total(v):
    if isinstance(v, list):
        total = 0.0
        for item in v:
            n = _num(item.get("amount")) if isinstance(item, dict) else _num(item)
            if n:
                total += n
        return round(total, 2)
    n = _num(v)
    return round(n, 2) if n is not None else None

def _norm_date(v):
    v = str(v).strip()
    try:
        return date.fromisoformat(v[:10]).isoformat()
    except ValueError:
        pass
    for f in ("%m/%d/%Y", "%m-%d-%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(v, f).date().isoformat()
        except ValueError:
            continue
    return None

@blueprint.route("/import", methods=["POST"])
@mod_auth(MOD_ID)
def import_payroll():
    r = request.get_json(silent=True)
    if r is None:
        return jsonify({"error": "JSON body required"}), 400
    filename, raw = "", r
    if isinstance(r, dict):
        filename = str(r.get("filename", "") or "")
        raw = r.get("paychecks", r)
    if isinstance(raw, dict):
        for k in ("paychecks", "entries", "checks", "items", "data"):
            if isinstance(raw.get(k), list):
                raw = raw[k]
                break
    entries = raw if isinstance(raw, list) else [raw]
    if len(entries) > IMPORT_MAX_ENTRIES:
        return jsonify({"error": f"Too many entries (max {IMPORT_MAX_ENTRIES} per file)"}), 400
    filename = filename.replace("\\", "/").split("/")[-1][:120]

    uid = session['uid']
    d = _load(uid)
    history = d.get("history", [])
    verified = added = 0
    skipped = []
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            skipped.append(f"entry {i+1}: not an object")
            continue
        iso = _norm_date(_pick(e, "pay_date", "payDate", "date", "pay_day", "payday") or "")
        net = _num(_pick(e, "net", "net_pay", "netPay", "take_home", "takeHome",
                         "net_amount", "netAmount", "amount"))
        if not iso:
            skipped.append(f"entry {i+1}: no pay date")
            continue
        if net is None or net <= 0:
            skipped.append(f"entry {i+1} ({iso}): no net amount")
            continue
        net = round(net, 2)
        gross = _num(_pick(e, "gross", "gross_pay", "grossPay", "gross_amount", "grossAmount"))
        taxes = _tax_total(_pick(e, "taxes", "tax", "tax_amount", "taxAmount",
                                 "withholding", "total_taxes"))
        ename = str(_pick(e, "source", "employer", "company", "source_name") or "").strip()

        best, best_score = None, None
        target = date.fromisoformat(iso)
        for h in history:
            if _status(h) != "estimated" or not h.get("date"):
                continue
            try:
                delta = abs((date.fromisoformat(h["date"]) - target).days)
            except ValueError:
                continue
            if delta > MATCH_WINDOW_DAYS:
                continue
            name_miss = 0 if (not ename or ename.lower() in str(h.get("source_name", "")).lower()) else 1
            score = (delta, name_miss)
            if best is None or score < best_score:
                best, best_score = h, score
        if best is not None:
            best.update({
                "date": iso, "actual": net,
                "difference": round(net - float(best.get("expected", 0)), 2),
                "status": "verified", "source_file": filename,
            })
            if gross is not None: best["gross"] = round(gross, 2)
            if taxes is not None: best["taxes"] = taxes
            verified += 1
        else:
            rec = {
                "id": new_id(), "source_id": "",
                "source_name": ename or "Payroll Import",
                "date": iso, "expected": 0, "actual": net, "difference": 0.0,
                "notes": "", "created": today(),
                "status": "verified", "source_file": filename,
            }
            if gross is not None: rec["gross"] = round(gross, 2)
            if taxes is not None: rec["taxes"] = taxes
            history.append(rec)
            added += 1
    d["history"] = history
    _save(uid, d)
    return jsonify({"ok": True, "verified": verified, "added": added,
                    "skipped": len(skipped), "reasons": skipped[:10]})

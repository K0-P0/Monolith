import json, os, uuid, secrets, base64, sqlite3, time, logging, string, shutil
from datetime import date
from pathlib import Path
from functools import wraps, lru_cache
import bcrypt
from flask import Blueprint, session, jsonify, request
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

os.umask(0o077)

BASE_DIR    = Path(__file__).parent.resolve()
_STORAGE    = Path(os.environ.get("MONOLITH_STORAGE", BASE_DIR))
DATA_DIR    = _STORAGE / "data"
DB_PATH     = _STORAGE / "vault.db"
SECRET_FILE = _STORAGE / ".secret"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def _master():
    if SECRET_FILE.exists(): return SECRET_FILE.read_bytes()
    s   = secrets.token_bytes(32)
    tmp = SECRET_FILE.with_name(f".secret.tmp.{os.getpid()}")
    tmp.write_bytes(s)
    os.chmod(tmp, 0o600)
    try:
        os.link(tmp, SECRET_FILE)
        return s
    except FileExistsError:
        return SECRET_FILE.read_bytes()
    finally:
        tmp.unlink(missing_ok=True)

MASTER = _master()

def _derive_key(purpose: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=purpose).derive(MASTER)

SESSION_KEY = _derive_key(b"monolith.flask-session-signing")

@lru_cache(maxsize=256)
def _fernet(uid: str) -> Fernet:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=uid.encode(), iterations=600_000)
    return Fernet(base64.urlsafe_b64encode(kdf.derive(MASTER)))

def load_mod_data(uid: str, mod_id: str) -> dict:
    f = DATA_DIR / uid / f"{mod_id}.enc"
    if not f.exists(): return {}
    try: return json.loads(_fernet(uid).decrypt(f.read_bytes()))
    except: return {}

def save_mod_data(uid: str, mod_id: str, data: dict):
    d = DATA_DIR / uid; d.mkdir(exist_ok=True)
    f = d / f"{mod_id}.enc"
    f.write_bytes(_fernet(uid).encrypt(json.dumps(data).encode()))
    os.chmod(f, 0o600)

def delete_mod_data(uid: str, mod_id: str):
    f = DATA_DIR / uid / f"{mod_id}.enc"
    if f.exists(): f.unlink()

def load_security(uid: str) -> dict:
    return load_mod_data(uid, '_vault_security')

def save_security(uid: str, data: dict):
    save_mod_data(uid, '_vault_security', data)

def delete_security(uid: str):
    delete_mod_data(uid, '_vault_security')

def delete_user_data(uid: str):
    d = DATA_DIR / uid
    if d.exists(): shutil.rmtree(d)

def get_db():
    is_new = not DB_PATH.exists()
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    if is_new:
        os.chmod(DB_PATH, 0o600)
    return conn

def new_id() -> str: return str(uuid.uuid4())
def today() -> str:  return date.today().isoformat()

FREQ_MONTHLY = {
    "weekly":      52 / 12,
    "biweekly":    26 / 12,
    "semimonthly": 24 / 12,
    "monthly":     1.0,
    "annual":      1 / 12,
    "one_time":    0.0,
}
PAY_GAP_DAYS = {"weekly": 7, "biweekly": 14, "semimonthly": 15, "monthly": 30, "annual": 365}

def safe_float(v, default=0.0):
    try: return float(v or 0)
    except (TypeError, ValueError): return default

def monthly_amount(amount, frequency, default_mult=0.0):
    return safe_float(amount) * FREQ_MONTHLY.get(frequency, default_mult)

def month_day_date(year: int, month: int, due_day) -> str | None:
    import calendar
    try:
        day = max(1, min(int(due_day), calendar.monthrange(year, month)[1]))
    except (ValueError, TypeError):
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"

def disabled_mod_ids(uid: str) -> set:
    with get_db() as db:
        g = db.execute("SELECT mod_id FROM global_mods WHERE globally_enabled=0").fetchall()
        u = db.execute("SELECT mod_id FROM user_mods WHERE user_id=? AND enabled=0", (uid,)).fetchall()
    return {r["mod_id"] for r in g} | {r["mod_id"] for r in u}

def json_body() -> dict:
    b = request.get_json(silent=True)
    return b if isinstance(b, dict) else {}

TRUSTED_IP_HEADER = "CF-Connecting-IP"
CF_ONLY           = False  # set True behind a Cloudflare Tunnel — the CF header is only trusted then

def client_ip() -> str:
    if not CF_ONLY:
        return request.remote_addr or "unknown"
    ip = request.headers.get(TRUSTED_IP_HEADER, "").strip()
    if ip: return ip.split(",")[0].strip()
    return "unknown"

class RateLimiter:
    def __init__(self, max_attempts: int = 5, window_secs: int = 900, lockout_secs: int = 900):
        self.max_attempts  = max_attempts
        self.window_secs   = window_secs
        self.lockout_secs  = lockout_secs

    def check(self, key: str) -> tuple:
        now = time.time()
        with get_db() as db:
            row = db.execute(
                "SELECT attempts, locked_until FROM rate_limits WHERE key=?", (key,)
            ).fetchone()
        if not row: return True, 0
        if row["locked_until"] > now: return False, int(row["locked_until"] - now)
        attempts = [t for t in json.loads(row["attempts"]) if now - t < self.window_secs]
        if len(attempts) >= self.max_attempts:
            lu = now + self.lockout_secs
            with get_db() as db:
                db.execute(
                    "UPDATE rate_limits SET locked_until=?, attempts=? WHERE key=?",
                    (lu, json.dumps(attempts), key)
                )
                db.commit()
            return False, self.lockout_secs
        return True, 0

    def record_failure(self, key: str):
        now = time.time()
        with get_db() as db:
            row = db.execute("SELECT attempts FROM rate_limits WHERE key=?", (key,)).fetchone()
            attempts = json.loads(row["attempts"]) if row else []
            attempts.append(now)
            db.execute(
                """INSERT INTO rate_limits(key, attempts, locked_until) VALUES(?,?,0.0)
                   ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts""",
                (key, json.dumps(attempts))
            )
            db.commit()

    def reset(self, key: str):
        with get_db() as db:
            db.execute("DELETE FROM rate_limits WHERE key=?", (key,))
            db.commit()

login_limiter    = RateLimiter(max_attempts=5, window_secs=900, lockout_secs=900)
totp_limiter     = RateLimiter(max_attempts=5, window_secs=300, lockout_secs=900)
register_limiter = RateLimiter(max_attempts=5, window_secs=900, lockout_secs=900)

def totp_mark_used(uid: str, code: str):
    now = time.time()
    with get_db() as db:
        db.execute(
            "INSERT OR REPLACE INTO totp_used(uid_code, used_at) VALUES(?,?)",
            (f"{uid}:{code}", now)
        )
        db.execute("DELETE FROM totp_used WHERE used_at < ?", (now - 90,))
        db.commit()

def totp_is_used(uid: str, code: str) -> bool:
    now = time.time()
    with get_db() as db:
        row = db.execute(
            "SELECT used_at FROM totp_used WHERE uid_code=?", (f"{uid}:{code}",)
        ).fetchone()
    return row is not None and now - row["used_at"] < 90

_BACKUP_CODE_CHARS = string.ascii_uppercase + string.digits

def gen_backup_codes(n: int = 8) -> list:
    return [
        "".join(secrets.choice(_BACKUP_CODE_CHARS) for _ in range(4))
        + "-"
        + "".join(secrets.choice(_BACKUP_CODE_CHARS) for _ in range(4))
        for _ in range(n)
    ]

def hash_backup_code(code: str) -> str:
    return bcrypt.hashpw(code.upper().replace("-", "").encode(), bcrypt.gensalt()).decode()

def verify_backup_code(code: str, hashed: str) -> bool:
    return bcrypt.checkpw(code.upper().replace("-", "").encode(), hashed.encode())

def backup_codes_remaining(sec: dict) -> int:
    return sum(1 for c in sec.get("backup_codes", []) if not c.get("used"))

def _sec_logger() -> logging.Logger:
    log = logging.getLogger("monolith.security")
    if not log.handlers:
        h = logging.FileHandler(BASE_DIR / "security.log")
        h.setFormatter(logging.Formatter("%(asctime)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%S"))
        log.addHandler(h)
        log.setLevel(logging.INFO)
    return log

def log_security(event: str, uid: str = None, username: str = None, ip: str = None, detail: str = None):
    parts = [f"event={event}"]
    if uid:      parts.append(f"uid={uid}")
    if username: parts.append(f"user={username}")
    if ip:       parts.append(f"ip={ip}")
    if detail:   parts.append(f"detail={detail}")
    _sec_logger().info("  ".join(parts))

def partial_auth(f):
    @wraps(f)
    def w(*a, **k):
        if 'uid' not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return f(*a, **k)
    return w

def auth(f):
    @wraps(f)
    def w(*a, **k):
        if 'uid' not in session:
            return jsonify({"error": "Not authenticated"}), 401
        if not session.get('totp_verified'):
            return jsonify({"error": "2FA verification required", "code": "totp_required"}), 403
        return f(*a, **k)
    return w

def admin_only(f):
    @wraps(f)
    def w(*a, **k):
        if 'uid' not in session:
            return jsonify({"error": "Not authenticated"}), 401
        if not session.get('totp_verified'):
            return jsonify({"error": "2FA verification required", "code": "totp_required"}), 403
        with get_db() as db:
            u = db.execute("SELECT is_admin FROM users WHERE id=?", (session['uid'],)).fetchone()
        if not u or not u['is_admin']:
            return jsonify({"error": "Admin required"}), 403
        return f(*a, **k)
    return w

def mod_auth(mod_id: str):
    def decorator(f):
        @wraps(f)
        def w(*a, **k):
            if 'uid' not in session:
                return jsonify({"error": "Not authenticated"}), 401
            if not session.get('totp_verified'):
                return jsonify({"error": "2FA verification required", "code": "totp_required"}), 403
            with get_db() as db:
                gm = db.execute("SELECT globally_enabled FROM global_mods WHERE mod_id=?", (mod_id,)).fetchone()
                if gm and not gm['globally_enabled']:
                    return jsonify({"error": "mod_globally_disabled"}), 403
                um = db.execute("SELECT enabled FROM user_mods WHERE user_id=? AND mod_id=?",
                                (session['uid'], mod_id)).fetchone()
                if um and not um['enabled']:
                    return jsonify({"error": "mod_disabled"}), 403
            return f(*a, **k)
        return w
    return decorator

def _co_str(v):   return str(v).strip() if v is not None else ""
def _co_float(v):
    if v in (None, ""): return 0.0
    if isinstance(v, bool): raise ValueError("bool is not a number")
    return float(v)
def _co_money(v): return max(0.0, round(_co_float(v), 2))
def _co_int(v):
    if v in (None, ""): return 0
    return int(float(v))
def _co_bool(v):  return bool(v)
def _co_day(v):   return max(1, min(31, _co_int(v) or 1))

_COERCERS = {"str": _co_str, "float": _co_float, "money": _co_money,
             "int": _co_int, "bool": _co_bool, "day": _co_day}

def str_max(n):
    def co(v): return _co_str(v)[:n]
    return co

def choice(options, fallback):
    def co(v): return v if v in options else fallback
    return co

def crud_blueprint(mod_id, fields, required=(), list_key="items",
                   on_create=None, on_update=None):
    bp = Blueprint(mod_id, __name__)

    def _load(uid): return load_mod_data(uid, mod_id).get(list_key, [])
    def _store(uid, items): save_mod_data(uid, mod_id, {list_key: items})

    def _coerce(key, value):
        co = fields[key][0]
        fn = _COERCERS[co] if isinstance(co, str) else co
        try:
            return fn(value)
        except (TypeError, ValueError):
            raise ValueError(key)

    @bp.route("/", methods=["GET"])
    @mod_auth(mod_id)
    def get_all():
        return jsonify(_load(session["uid"]))

    @bp.route("/", methods=["POST"])
    @mod_auth(mod_id)
    def add():
        r = json_body(); uid = session["uid"]
        rec = {"id": new_id()}
        try:
            for k, (co, default) in fields.items():
                rec[k] = _coerce(k, r[k]) if k in r else (default() if callable(default) else default)
        except ValueError as bad:
            return jsonify({"error": f"invalid {bad}"}), 400
        missing = [k for k in required if not rec.get(k)]
        if missing:
            return jsonify({"error": f"{' and '.join(required)} required"}), 400
        rec["created"] = today()
        if on_create: on_create(rec, r)
        items = _load(uid); items.append(rec); _store(uid, items)
        return jsonify(rec), 201

    @bp.route("/<rid>", methods=["PUT"])
    @mod_auth(mod_id)
    def update(rid):
        r = json_body(); uid = session["uid"]; items = _load(uid)
        for item in items:
            if item.get("id") == rid:
                try:
                    for k in fields:
                        if k in r: item[k] = _coerce(k, r[k])
                except ValueError as bad:
                    return jsonify({"error": f"invalid {bad}"}), 400
                if on_update: on_update(item, r)
                _store(uid, items)
                return jsonify(item)
        return jsonify({"error": "not found"}), 404

    @bp.route("/<rid>", methods=["DELETE"])
    @mod_auth(mod_id)
    def delete(rid):
        uid = session["uid"]
        _store(uid, [i for i in _load(uid) if i.get("id") != rid])
        return jsonify({"ok": True})

    return bp

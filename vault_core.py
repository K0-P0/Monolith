import json, os, uuid, secrets, base64, sqlite3, time, logging
from datetime import date
from pathlib import Path
from functools import wraps
from flask import session, jsonify, request
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

BASE_DIR    = Path(__file__).parent.resolve()
_STORAGE    = Path(os.environ.get("MONOLITH_STORAGE", BASE_DIR))
DATA_DIR    = _STORAGE / "data"
DB_PATH     = _STORAGE / "vault.db"
SECRET_FILE = _STORAGE / ".secret"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def _master():
    if SECRET_FILE.exists(): return SECRET_FILE.read_bytes()
    s = secrets.token_bytes(32); SECRET_FILE.write_bytes(s); os.chmod(SECRET_FILE, 0o600); return s

MASTER = _master()

def _fernet(uid: str) -> Fernet:
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=uid.encode(), iterations=100_000)
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

def get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn

def new_id() -> str: return str(uuid.uuid4())[:8]
def today() -> str:  return date.today().isoformat()

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

login_limiter = RateLimiter(max_attempts=5, window_secs=900, lockout_secs=900)
totp_limiter  = RateLimiter(max_attempts=5, window_secs=300, lockout_secs=900)

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

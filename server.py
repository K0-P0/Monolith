import json, os, sys, secrets, importlib.util, shutil, string
from datetime import datetime
from pathlib import Path
import bcrypt
import pyotp
import qrcode
from qrcode.image.svg import SvgPathImage
import io
from flask import Flask, jsonify, request, send_from_directory, session, Response

BASE_DIR    = Path(__file__).parent.resolve()
STATIC_DIR  = BASE_DIR / "static"
PLUGINS_DIR = BASE_DIR / "plugins"
SECRET_FILE = BASE_DIR / ".secret"
CONFIG_FILE = BASE_DIR / "vault_config.json"
sys.path.insert(0, str(BASE_DIR))

from vault_core import (
    auth, admin_only, partial_auth, mod_auth,
    get_db, load_mod_data, save_mod_data, delete_mod_data,
    load_security, save_security, delete_security,
    new_id, today, DATA_DIR,
    login_limiter, totp_limiter, register_limiter,
    totp_mark_used, totp_is_used,
    log_security, client_ip as _client_ip,
)

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")
app.secret_key = SECRET_FILE.read_bytes() if SECRET_FILE.exists() else secrets.token_bytes(32)
SESSION_COOKIE_SECURE = os.environ.get("VAULT_COOKIE_SECURE", "true").lower() == "true"

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
    PERMANENT_SESSION_LIFETIME=43200,
    MAX_CONTENT_LENGTH=32 * 1024 * 1024,
)
PLUGINS = {}

@app.after_request
def _security_headers(response):
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self'; "
        "img-src 'self' data:; "
        "connect-src 'self'"
    )
    return response

def _regenerate_session():
    data = dict(session)
    session.clear()
    session.update(data)

def make_qr_svg(data: str) -> str:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=8, border=3)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(image_factory=SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode("utf-8")
    svg = svg.replace("<svg ", '<svg style="width:100%;height:auto;max-width:240px" ', 1)
    return svg

_CODE_CHARS = string.ascii_uppercase + string.digits

def _gen_codes(n: int = 8) -> list:
    return [
        "".join(secrets.choice(_CODE_CHARS) for _ in range(4))
        + "-"
        + "".join(secrets.choice(_CODE_CHARS) for _ in range(4))
        for _ in range(n)
    ]

def _hash_code(code: str) -> str:
    return bcrypt.hashpw(code.upper().replace("-", "").encode(), bcrypt.gensalt()).decode()

def _verify_code(code: str, hashed: str) -> bool:
    return bcrypt.checkpw(code.upper().replace("-", "").encode(), hashed.encode())

def _find_and_consume_backup(uid: str, code: str) -> bool:
    sec = load_security(uid)
    for entry in sec.get("backup_codes", []):
        if not entry.get("used") and _verify_code(code, entry["hash"]):
            entry["used"] = True
            save_security(uid, sec)
            return True
    return False

def _backup_remaining(sec: dict) -> int:
    return sum(1 for c in sec.get("backup_codes", []) if not c.get("used"))

def get_config() -> dict:
    if CONFIG_FILE.exists():
        try: return json.loads(CONFIG_FILE.read_text())
        except: pass
    return {}

def set_config(updates: dict):
    cfg = get_config(); cfg.update(updates)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2))

def registration_open() -> bool:
    with get_db() as db:
        has_users = bool(db.execute("SELECT 1 FROM users LIMIT 1").fetchone())
    if not has_users: return True
    return get_config().get("allow_registration", True)

def init_db():
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL, is_admin INTEGER DEFAULT 0,
                created TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS user_mods (
                user_id TEXT NOT NULL, mod_id TEXT NOT NULL,
                enabled INTEGER DEFAULT 1, disabled_at TEXT,
                PRIMARY KEY(user_id, mod_id));
            CREATE TABLE IF NOT EXISTS global_mods (
                mod_id TEXT PRIMARY KEY, globally_enabled INTEGER DEFAULT 1,
                disabled_by TEXT, disabled_at TEXT);
            CREATE TABLE IF NOT EXISTS rate_limits (
                key TEXT PRIMARY KEY,
                attempts TEXT NOT NULL DEFAULT '[]',
                locked_until REAL NOT NULL DEFAULT 0.0);
            CREATE TABLE IF NOT EXISTS totp_used (
                uid_code TEXT PRIMARY KEY,
                used_at REAL NOT NULL);
        """)

def load_plugins():
    if not PLUGINS_DIR.exists(): return
    for pd in sorted(PLUGINS_DIR.iterdir()):
        if not pd.is_dir(): continue
        mf, rf = pd / "manifest.json", pd / "routes.py"
        if not mf.exists() or not rf.exists(): continue
        try:
            manifest = json.loads(mf.read_text()); mid = manifest["id"]
            spec = importlib.util.spec_from_file_location(f"monolith_plugin_{mid}", rf)
            mod  = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
            if hasattr(mod, "blueprint"):
                app.register_blueprint(mod.blueprint, url_prefix=f"/api/mod/{mid}")
            PLUGINS[mid] = manifest
            with get_db() as db:
                db.execute("INSERT OR IGNORE INTO global_mods(mod_id,globally_enabled) VALUES(?,1)", (mid,))
                db.commit()
            print(f"  [plugin] loaded: {mid}")
        except Exception as e:
            print(f"  [warn]   failed {pd.name}: {e}")

@app.route("/")
def index(): return send_from_directory(str(STATIC_DIR), "index.html")

@app.route("/api/me")
def me():
    if "uid" not in session:
        return jsonify({"error": "Not authenticated"}), 401
    with get_db() as db:
        u = db.execute("SELECT id,username,is_admin FROM users WHERE id=?",
                       (session["uid"],)).fetchone()
    if not u:
        session.clear()
        return jsonify({"error": "Not authenticated"}), 401
    if not session.get("totp_verified", False):
        sec    = load_security(u["id"])
        status = "totp_required" if sec.get("totp_secret") else "setup_required"
        return jsonify({"status": status, "id": u["id"], "username": u["username"]})
    return jsonify({"id": u["id"], "username": u["username"], "is_admin": bool(u["is_admin"])})

@app.route("/api/registration-status")
def registration_status():
    return jsonify({"open": registration_open()})

@app.route("/api/register", methods=["POST"])
def register():
    ip     = _client_ip()
    ip_key = f"register:{ip}"
    allowed, wait = register_limiter.check(ip_key)
    if not allowed:
        return jsonify({"error": f"Too many attempts. Try again in {wait}s.",
                        "locked": True, "wait_seconds": wait}), 429
    register_limiter.record_failure(ip_key)
    if not registration_open():
        return jsonify({"error": "Registration is closed. Contact the admin."}), 403
    r        = request.get_json()
    username = r.get("username", "").strip()
    password = r.get("password", "")
    if len(username) < 3: return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 8: return jsonify({"error": "Password must be at least 8 characters"}), 400
    with get_db() as db:
        if db.execute("SELECT 1 FROM users WHERE lower(username)=lower(?)", (username,)).fetchone():
            return jsonify({"error": "Username already taken"}), 409
        is_admin = not bool(db.execute("SELECT 1 FROM users LIMIT 1").fetchone())
        uid = new_id()
        db.execute("INSERT INTO users VALUES(?,?,?,?,?)",
                   (uid, username,
                    bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
                    int(is_admin), today()))
        db.commit()
    session.permanent = True
    session["uid"] = uid; session["username"] = username; session["totp_verified"] = False
    return jsonify({"status": "setup_required", "id": uid, "username": username,
                    "is_admin": is_admin}), 201

@app.route("/api/login", methods=["POST"])
def login():
    ip     = _client_ip()
    ip_key = f"login:{ip}"
    allowed, wait = login_limiter.check(ip_key)
    if not allowed:
        return jsonify({"error": f"Too many failed attempts. Try again in {wait}s.",
                        "locked": True, "wait_seconds": wait}), 429
    r        = request.get_json()
    username = r.get("username", "").strip()
    user_key = f"login_user:{username.lower()}"
    allowed, wait = login_limiter.check(user_key)
    if not allowed:
        return jsonify({"error": f"Too many failed attempts. Try again in {wait}s.",
                        "locked": True, "wait_seconds": wait}), 429
    with get_db() as db:
        u = db.execute("SELECT * FROM users WHERE lower(username)=lower(?)",
                       (username,)).fetchone()
    if not u or not bcrypt.checkpw(r.get("password", "").encode(), u["password_hash"].encode()):
        login_limiter.record_failure(ip_key)
        login_limiter.record_failure(user_key)
        log_security("login_fail", username=username, ip=ip, detail="bad_credentials")
        return jsonify({"error": "Invalid username or password"}), 401
    login_limiter.reset(ip_key)
    login_limiter.reset(user_key)
    _regenerate_session()
    session.permanent = True
    session["uid"] = u["id"]; session["username"] = u["username"]
    session["totp_verified"] = False
    sec    = load_security(u["id"])
    status = "totp_required" if sec.get("totp_secret") else "setup_required"
    return jsonify({"status": status, "id": u["id"], "username": u["username"]})

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})

@app.route("/api/totp/setup", methods=["GET"])
@partial_auth
def totp_setup_get():
    with get_db() as db:
        u = db.execute("SELECT username FROM users WHERE id=?", (session["uid"],)).fetchone()
    if not u: return jsonify({"error": "User not found"}), 404
    secret = pyotp.random_base32()
    uri    = pyotp.TOTP(secret).provisioning_uri(name=u["username"], issuer_name="Monolith")
    session["pending_totp"] = secret
    return jsonify({"svg": make_qr_svg(uri), "secret": secret, "uri": uri,
                    "account": u["username"], "issuer": "Monolith"})

@app.route("/api/totp/setup", methods=["POST"])
@partial_auth
def totp_setup_post():
    r    = request.get_json()
    code = str(r.get("code", "")).strip().replace(" ", "")
    if len(code) != 6 or not code.isdigit():
        return jsonify({"error": "Enter the 6-digit code from your authenticator app"}), 400
    secret = session.get("pending_totp")
    if not secret:
        return jsonify({"error": "Setup session expired — start over"}), 400
    uid = session["uid"]
    if not pyotp.TOTP(secret).verify(code, valid_window=1):
        log_security("totp_setup_fail", uid=uid, ip=_client_ip(), detail="wrong_code")
        return jsonify({"error": "Incorrect code — check your app and try again"}), 400
    if totp_is_used(uid, code):
        return jsonify({"error": "This code was already used — wait for the next one"}), 400
    totp_mark_used(uid, code)
    plain_codes = _gen_codes(8)
    sec = load_security(uid)
    sec.update({
        "totp_secret":          secret,
        "totp_setup_date":      today(),
        "backup_codes":         [{"hash": _hash_code(c), "used": False} for c in plain_codes],
        "backup_codes_created": today(),
    })
    save_security(uid, sec)
    session.pop("pending_totp", None)
    _regenerate_session()
    session.permanent = True
    session["totp_verified"] = True
    with get_db() as db:
        u = db.execute("SELECT id,username,is_admin FROM users WHERE id=?", (uid,)).fetchone()
    log_security("totp_setup_complete", uid=uid, username=u["username"], ip=_client_ip())
    return jsonify({"id": u["id"], "username": u["username"], "is_admin": bool(u["is_admin"]),
                    "backup_codes": plain_codes})

@app.route("/api/totp/verify", methods=["POST"])
@partial_auth
def totp_verify():
    uid = session["uid"]
    key = f"totp:{uid}"
    allowed, wait = totp_limiter.check(key)
    if not allowed:
        log_security("totp_lockout", uid=uid, ip=_client_ip())
        return jsonify({"error": f"Too many failed attempts. Try again in {wait}s.",
                        "locked": True, "wait_seconds": wait}), 429
    r    = request.get_json()
    code = str(r.get("code", "")).strip().replace(" ", "")
    if len(code) != 6 or not code.isdigit():
        return jsonify({"error": "Enter the 6-digit code"}), 400
    sec = load_security(uid)
    if not sec.get("totp_secret"):
        return jsonify({"error": "2FA not configured — contact admin"}), 400
    if not pyotp.TOTP(sec["totp_secret"]).verify(code, valid_window=1):
        totp_limiter.record_failure(key)
        log_security("totp_fail", uid=uid, ip=_client_ip(), detail="wrong_code")
        return jsonify({"error": "Incorrect code — check your app and try again"}), 400
    if totp_is_used(uid, code):
        return jsonify({"error": "This code was already used — wait for the next one"}), 400
    totp_mark_used(uid, code)
    totp_limiter.reset(key)
    _regenerate_session()
    session.permanent = True
    session["totp_verified"] = True
    with get_db() as db:
        u = db.execute("SELECT id,username,is_admin FROM users WHERE id=?", (uid,)).fetchone()
    return jsonify({"id": u["id"], "username": u["username"], "is_admin": bool(u["is_admin"])})

@app.route("/api/totp/backup", methods=["POST"])
@partial_auth
def totp_backup_verify():
    uid = session["uid"]
    key = f"totp:{uid}"
    allowed, wait = totp_limiter.check(key)
    if not allowed:
        return jsonify({"error": f"Too many failed attempts. Try again in {wait}s.",
                        "locked": True, "wait_seconds": wait}), 429
    r    = request.get_json()
    code = str(r.get("code", "")).strip()
    if not code:
        return jsonify({"error": "Enter a backup code"}), 400
    sec = load_security(uid)
    if not sec.get("backup_codes"):
        return jsonify({"error": "No backup codes on file"}), 400
    if not _find_and_consume_backup(uid, code):
        totp_limiter.record_failure(key)
        log_security("backup_code_fail", uid=uid, ip=_client_ip())
        return jsonify({"error": "Invalid or already-used backup code"}), 400
    totp_limiter.reset(key)
    _regenerate_session()
    session.permanent = True
    session["totp_verified"] = True
    remaining = _backup_remaining(load_security(uid))
    log_security("backup_code_used", uid=uid, ip=_client_ip(), detail=f"{remaining}_remaining")
    with get_db() as db:
        u = db.execute("SELECT id,username,is_admin FROM users WHERE id=?", (uid,)).fetchone()
    return jsonify({"id": u["id"], "username": u["username"], "is_admin": bool(u["is_admin"]),
                    "backup_codes_remaining": remaining,
                    "warning": (
                        "You have no backup codes left. Regenerate them in Profile → Security."
                        if remaining == 0 else
                        f"You have {remaining} backup code(s) remaining." if remaining <= 2 else None
                    )})

_DASH_KEY = "_dashboard_layout"

@app.route("/api/user/dashboard", methods=["GET"])
@auth
def get_dashboard_layout():
    return jsonify(load_mod_data(session["uid"], _DASH_KEY))

@app.route("/api/user/dashboard", methods=["POST"])
@auth
def save_dashboard_layout():
    r = request.get_json()
    if not isinstance(r, dict):
        return jsonify({"error": "Invalid layout"}), 400
    layout = {k: v for k, v in r.items() if k in {"sections", "widgets", "hidden_widgets"}}
    save_mod_data(session["uid"], _DASH_KEY, layout)
    return jsonify({"ok": True})

def _purge_expired(uid: str):
    with get_db() as db:
        rows = db.execute(
            "SELECT mod_id,disabled_at FROM user_mods WHERE user_id=? AND enabled=0 AND disabled_at IS NOT NULL",
            (uid,)).fetchall()
    for row in rows:
        try:
            if (datetime.now() - datetime.fromisoformat(row["disabled_at"])).days >= 30:
                delete_mod_data(uid, row["mod_id"])
                with get_db() as db:
                    db.execute("DELETE FROM user_mods WHERE user_id=? AND mod_id=?",
                               (uid, row["mod_id"])); db.commit()
        except Exception:
            pass

@app.route("/api/mods")
@auth
def list_mods():
    uid = session["uid"]; _purge_expired(uid); result = []
    with get_db() as db:
        is_admin = bool(db.execute("SELECT is_admin FROM users WHERE id=?", (uid,)).fetchone()["is_admin"])
        for mid, manifest in PLUGINS.items():
            if manifest.get("nav_section") == "_core" and not is_admin:
                continue
            gm   = db.execute("SELECT globally_enabled FROM global_mods WHERE mod_id=?", (mid,)).fetchone()
            g_on = (not gm) or bool(gm["globally_enabled"])
            um   = db.execute("SELECT enabled,disabled_at FROM user_mods WHERE user_id=? AND mod_id=?",
                              (uid, mid)).fetchone()
            u_on = bool(um["enabled"]) if um else True
            dat  = um["disabled_at"] if um else None
            days = None
            if dat and not u_on:
                try: days = max(0, 30 - (datetime.now() - datetime.fromisoformat(dat)).days)
                except: pass
            result.append({**manifest, "globally_enabled": g_on, "user_enabled": u_on,
                           "disabled_at": dat, "days_until_deletion": days})
    result.sort(key=lambda x: (x.get("nav_section","z"), x.get("nav_order", 99)))
    return jsonify(result)

@app.route("/api/mods/<mod_id>/toggle", methods=["POST"])
@auth
def toggle_mod(mod_id):
    if mod_id not in PLUGINS: return jsonify({"error": "Unknown mod"}), 404
    enable  = bool(request.get_json().get("enabled", True))
    uid     = session["uid"]
    now_iso = None if enable else datetime.now().isoformat()
    with get_db() as db:
        db.execute(
            """INSERT INTO user_mods(user_id,mod_id,enabled,disabled_at) VALUES(?,?,?,?)
               ON CONFLICT(user_id,mod_id) DO UPDATE
               SET enabled=excluded.enabled, disabled_at=excluded.disabled_at""",
            (uid, mod_id, int(enable), now_iso)); db.commit()
    return jsonify({"ok": True, "enabled": enable,
                    "message": "Mod enabled." if enable else "Mod hidden. Data deletes in 30 days if not re-enabled."})

@app.route("/api/admin/mods")
@admin_only
def admin_list_mods():
    with get_db() as db:
        return jsonify([
            {**m, "globally_enabled": bool(
                (db.execute("SELECT globally_enabled FROM global_mods WHERE mod_id=?",
                            (mid,)).fetchone() or {"globally_enabled": 1})["globally_enabled"]
            )}
            for mid, m in PLUGINS.items()
        ])

@app.route("/api/admin/mods/<mod_id>/toggle", methods=["POST"])
@admin_only
def admin_toggle_mod(mod_id):
    if mod_id not in PLUGINS: return jsonify({"error": "Unknown mod"}), 404
    enable = bool(request.get_json().get("enabled", True))
    with get_db() as db:
        db.execute(
            """INSERT INTO global_mods(mod_id,globally_enabled,disabled_by,disabled_at)
               VALUES(?,?,?,?)
               ON CONFLICT(mod_id) DO UPDATE
               SET globally_enabled=excluded.globally_enabled,
                   disabled_by=excluded.disabled_by,
                   disabled_at=excluded.disabled_at""",
            (mod_id, int(enable),
             None if enable else session["uid"],
             None if enable else datetime.now().isoformat()))
        db.commit()
    return jsonify({"ok": True})

@app.route("/api/admin/users")
@admin_only
def admin_users():
    with get_db() as db:
        users = [dict(u) for u in
                 db.execute("SELECT id,username,is_admin,created FROM users").fetchall()]
    for u in users:
        sec = load_security(u["id"])
        u["totp_configured"]        = bool(sec.get("totp_secret"))
        u["totp_setup_date"]        = sec.get("totp_setup_date")
        u["backup_codes_remaining"] = _backup_remaining(sec)
    return jsonify(users)

@app.route("/api/admin/users/<uid>", methods=["DELETE"])
@admin_only
def admin_delete_user(uid):
    if uid == session["uid"]:
        return jsonify({"error": "Cannot delete your own account"}), 400
    with get_db() as db:
        u = db.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not u: return jsonify({"error": "User not found"}), 404
        db.execute("DELETE FROM users WHERE id=?", (uid,))
        db.execute("DELETE FROM user_mods WHERE user_id=?", (uid,))
        db.commit()
    user_dir = DATA_DIR / uid
    if user_dir.exists(): shutil.rmtree(user_dir)
    log_security("user_deleted", uid=uid, username=u["username"], detail=f"by_admin={session['uid']}")
    return jsonify({"ok": True})

@app.route("/api/admin/users/<uid>/reset-password", methods=["POST"])
@admin_only
def admin_reset_password(uid):
    if uid == session["uid"]:
        return jsonify({"error": "Use Profile to change your own password"}), 400
    r = request.get_json()
    if len(r.get("new_password", "")) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if not r.get("confirmed"):
        return jsonify({"error": "Must confirm data wipe before resetting"}), 400
    with get_db() as db:
        u = db.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not u: return jsonify({"error": "User not found"}), 404
        db.execute("UPDATE users SET password_hash=? WHERE id=?",
                   (bcrypt.hashpw(r["new_password"].encode(), bcrypt.gensalt()).decode(), uid))
        db.execute("DELETE FROM user_mods WHERE user_id=?", (uid,))
        db.commit()
    user_dir = DATA_DIR / uid
    if user_dir.exists(): shutil.rmtree(user_dir)
    log_security("password_reset_by_admin", uid=uid, username=u["username"], detail=f"by_admin={session['uid']}")
    return jsonify({"ok": True, "message": f"Password reset for {u['username']}. Their data has been cleared."})

@app.route("/api/admin/users/<uid>/reset-totp", methods=["DELETE"])
@admin_only
def admin_reset_totp(uid):
    if uid == session["uid"]:
        return jsonify({"error": "Use Profile to manage your own 2FA"}), 400
    with get_db() as db:
        u = db.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
        if not u: return jsonify({"error": "User not found"}), 404
    sec = load_security(uid)
    sec.pop("totp_secret", None)
    sec.pop("totp_setup_date", None)
    sec.pop("backup_codes", None)
    sec.pop("backup_codes_created", None)
    save_security(uid, sec)
    log_security("totp_reset_by_admin", uid=uid, username=u["username"], detail=f"by_admin={session['uid']}")
    return jsonify({"ok": True, "message": f"2FA reset for {u['username']}. They must re-enroll on next login."})

@app.route("/api/admin/registration", methods=["POST"])
@admin_only
def admin_set_registration():
    allow = bool(request.get_json().get("allow", True))
    set_config({"allow_registration": allow})
    return jsonify({"ok": True, "allow_registration": allow,
                    "message": "Registration " + ("opened." if allow else "closed.")})

@app.route("/api/user/onboarding", methods=["GET"])
@auth
def get_onboarding():
    uid = session["uid"]
    data = load_mod_data(uid, '_vault_onboarding')
    return jsonify({
        "completed":  bool(data.get("completed")),
        "selections": data.get("selections", []),
        "tour_seen":  bool(data.get("tour_seen")),
    })

@app.route("/api/user/onboarding", methods=["POST"])
@auth
def save_onboarding():
    uid = session["uid"]
    r = request.get_json() or {}
    selections = r.get("selections", [])

    MOD_MAP = {
        "sel_paycheck":  ["paycheck_pro"],
        "sel_freelance": ["freelance_flow"],
        "sel_savings":   ["savings"],
        "sel_debt":      ["debt_payoff"],
        "sel_bills":     ["bills", "subscriptions"],
        "sel_vehicle":   ["garage"],
        "sel_expenses":  ["expenses"],
        "sel_calendar":  ["calendar_view"],
    }

    MANAGED = {"paycheck_pro", "freelance_flow", "savings", "debt_payoff",
               "bills", "subscriptions", "garage", "expenses", "calendar_view",
               "net_worth"}

    enabled_mods = set()
    for sel in selections:
        enabled_mods.update(MOD_MAP.get(sel, []))

    now_iso = datetime.now().isoformat()
    with get_db() as db:
        for mod_id in MANAGED:
            if mod_id not in PLUGINS:
                continue
            enable = mod_id in enabled_mods
            db.execute(
                """INSERT INTO user_mods(user_id,mod_id,enabled,disabled_at) VALUES(?,?,?,?)
                   ON CONFLICT(user_id,mod_id) DO UPDATE
                   SET enabled=excluded.enabled, disabled_at=excluded.disabled_at""",
                (uid, mod_id, int(enable), None if enable else now_iso)
            )
        db.commit()

    save_mod_data(uid, '_vault_onboarding', {
        "completed":    True,
        "selections":   selections,
        "completed_at": now_iso,
        "tour_seen":    False,
    })
    return jsonify({"ok": True})

@app.route("/api/user/tour-seen", methods=["POST"])
@auth
def mark_tour_seen():
    uid  = session["uid"]
    data = load_mod_data(uid, '_vault_onboarding')
    data["tour_seen"] = True
    save_mod_data(uid, '_vault_onboarding', data)
    return jsonify({"ok": True})

@app.route("/api/user/tour-seen", methods=["DELETE"])
@auth
def reset_tour():
    uid  = session["uid"]
    data = load_mod_data(uid, '_vault_onboarding')
    data["tour_seen"] = False
    save_mod_data(uid, '_vault_onboarding', data)
    return jsonify({"ok": True})

@app.route("/api/mod/<mod_id>/ui.js")
@auth
def mod_ui_js(mod_id):
    if mod_id not in PLUGINS: return "// mod not found", 404
    ui_file = PLUGINS_DIR / mod_id / "ui.js"
    if not ui_file.exists(): return "// no ui defined", 200
    resp = Response(ui_file.read_text(encoding="utf-8"), mimetype="application/javascript")
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return resp

_EXPORT_DENYLIST = {"_vault_security", "_vault_internal", "_dashboard_layout"}

@app.route("/api/export/json")
@auth
def export_json():
    uid  = session["uid"]
    data = {mid: load_mod_data(uid, mid) for mid in PLUGINS
            if mid not in _EXPORT_DENYLIST and not mid.startswith("_")}
    return Response(
        json.dumps(data, indent=2).encode(),
        mimetype="application/json",
        headers={"Content-Disposition": f'attachment; filename="monolith-backup-{today()}.json"'})

@app.route("/api/import/json", methods=["POST"])
@auth
def import_json():
    if "file" not in request.files: return jsonify({"error": "no file"}), 400
    try: imported = json.loads(request.files["file"].read().decode())
    except Exception as e: return jsonify({"error": str(e)}), 400
    uid = session["uid"]
    for mid, data in imported.items():
        if mid in PLUGINS and not mid.startswith("_") and isinstance(data, dict):
            save_mod_data(uid, mid, data)
    return jsonify({"ok": True, "message": "Data imported successfully."})

init_db()
load_plugins()

if __name__ == "__main__":
    print(f"\n  Monolith v6 — {len(PLUGINS)} plugins loaded")
    print(f"  http://0.0.0.0:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False)

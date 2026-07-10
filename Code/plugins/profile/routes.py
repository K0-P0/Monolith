import pyotp
import bcrypt
from flask import Blueprint, jsonify, request, session
from vault_core import (
    auth, load_security, save_security,
    totp_limiter, totp_mark_used, totp_is_used,
    gen_backup_codes, hash_backup_code, backup_codes_remaining,
    log_security, get_db, today, client_ip as _client_ip, json_body,)

MOD_ID    = "profile"
blueprint = Blueprint(MOD_ID, __name__)

def _verify_totp_inline(uid: str, code: str) -> bool:
    sec  = load_security(uid)
    if not sec.get("totp_secret"): return False
    code = str(code).strip().replace(" ", "")
    if len(code) != 6 or not code.isdigit(): return False
    if totp_is_used(uid, code): return False
    if not pyotp.TOTP(sec["totp_secret"]).verify(code, valid_window=1): return False
    totp_mark_used(uid, code)
    return True

@blueprint.route("/", methods=["GET"])
@auth
def get_profile():
    uid = session["uid"]
    with get_db() as db:
        u = db.execute("SELECT id,username,is_admin,created FROM users WHERE id=?", (uid,)).fetchone()
    if not u: return jsonify({"error": "Not found"}), 404
    sec = load_security(uid)
    return jsonify({
        "id":                    u["id"],
        "username":              u["username"],
        "is_admin":              bool(u["is_admin"]),
        "created":               u["created"],
        "totp_configured":       bool(sec.get("totp_secret")),
        "totp_setup_date":       sec.get("totp_setup_date"),
        "backup_codes_remaining": backup_codes_remaining(sec),
    })

@blueprint.route("/change-password", methods=["POST"])
@auth
def change_password():
    r   = json_body()
    uid = session["uid"]
    with get_db() as db:
        u = db.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()
    if not bcrypt.checkpw(r.get("current", "").encode(), u["password_hash"].encode()):
        return jsonify({"error": "Current password incorrect"}), 400
    if len(r.get("new", "")) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    with get_db() as db:
        db.execute("UPDATE users SET password_hash=? WHERE id=?",
                   (bcrypt.hashpw(r["new"].encode(), bcrypt.gensalt()).decode(), uid))
        db.commit()
    log_security("password_changed", uid=uid, ip=_client_ip())
    return jsonify({"ok": True})

@blueprint.route("/regen-backup-codes", methods=["POST"])
@auth
def regen_backup_codes():
    r   = json_body()
    uid = session["uid"]
    if not _verify_totp_inline(uid, str(r.get("totp_confirm", "")).strip()):
        log_security("backup_regen_fail", uid=uid, ip=_client_ip(), detail="bad_totp")
        return jsonify({"error": "Enter a valid current code from your authenticator app to confirm."}), 403
    plain_codes = gen_backup_codes(8)
    sec = load_security(uid)
    sec["backup_codes"]         = [{"hash": hash_backup_code(c), "used": False} for c in plain_codes]
    sec["backup_codes_created"] = today()
    save_security(uid, sec)
    log_security("backup_codes_regenerated", uid=uid, ip=_client_ip())
    return jsonify({
        "ok":          True,
        "backup_codes": plain_codes,
        "message":     "New backup codes generated. Save them somewhere safe — they will not be shown again.",
    })

@blueprint.route("/disable-2fa", methods=["DELETE"])
@auth
def disable_2fa():
    r   = json_body()
    uid = session["uid"]
    with get_db() as db:
        u = db.execute("SELECT password_hash,username FROM users WHERE id=?", (uid,)).fetchone()
    if not bcrypt.checkpw(r.get("password", "").encode(), u["password_hash"].encode()):
        return jsonify({"error": "Incorrect password"}), 403
    if not _verify_totp_inline(uid, str(r.get("totp_confirm", "")).strip()):
        log_security("disable_2fa_fail", uid=uid, ip=_client_ip(), detail="bad_totp")
        return jsonify({"error": "Enter a valid code from your authenticator app."}), 403
    save_security(uid, {})
    log_security("totp_disabled", uid=uid, username=u["username"], ip=_client_ip())
    return jsonify({"ok": True, "message": "2FA removed. You will be required to set it up again on next login."})

# Security Policy

## Supported Versions

Only the latest release of Monolith is actively supported with security updates.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

To report a vulnerability, contact via Matrix: @k0p0:matrix.org

Include in your report:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an acknowledgment within **48 hours** and a status update within **7 days**.

If the vulnerability is confirmed, a fix will be prioritized and released as quickly as possible. You will be credited in the release notes unless you prefer to remain anonymous.

## Security Features

Monolith is built with the following security controls:

- **Passwords** — hashed with bcrypt (cost factor 12)
- **Data at rest** — per-user files encrypted with Fernet (AES-128-CBC + HMAC-SHA256)
- **2FA** — TOTP via RFC 6238 (compatible with Google Authenticator, Authy, etc.)
- **TOTP secrets** — stored encrypted, never in plaintext
- **Sessions** — server-side, HttpOnly, SameSite=Lax cookies
- **Secure cookie flag** — enforced when `VAULT_COOKIE_SECURE=true` (set automatically in Docker)
- **Re-authentication** — required for sensitive operations (password change, 2FA setup, data export)
- **Admin isolation** — admin-only routes are decorator-enforced, not just hidden
- **No external dependencies at runtime** — no calls to third-party APIs

## Deployment Recommendations

- Run behind a reverse proxy (Nginx) — included in both bare-metal and Docker setups
- Use HTTPS in production — see `INSTALL_GUIDE.txt` for Certbot instructions
- Do not expose port 5000 (Gunicorn) directly; only expose 80/443 via Nginx
- Keep the host system and Python packages updated regularly
- Back up your `data/` directory and `vault.db` regularly

## Scope

The following are **in scope** for vulnerability reports:

- Authentication bypass
- Privilege escalation (user → admin)
- Insecure direct object references (accessing another user's data)
- Session hijacking or fixation
- Injection vulnerabilities (SQL, path traversal, template injection)
- Cryptographic weaknesses in the encryption or hashing implementation

The following are **out of scope**:

- Vulnerabilities requiring physical access to the host machine
- Denial of service attacks
- Issues in third-party libraries (report those upstream)
- Self-XSS or attacks requiring the victim to already be authenticated as admin

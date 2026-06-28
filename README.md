Monolith
========
A self-hosted personal finance dashboard with encrypted data, mandatory 2FA,
and a modular plugin system. Run it on your own machine or server — your data
never leaves your hands.


FEATURES
--------
- Per-user Fernet encrypted data at rest
- Mandatory TOTP two-factor authentication with backup codes
- Modular plugin architecture — enable or disable what you need
- Nginx + Gunicorn production stack
- SQLite database with WAL mode for multi-worker safety
- Admin panel with user management and global plugin controls
- Full JSON export and import for backups
- Docker ready — one command to run


PLUGINS INCLUDED
----------------
  Paycheck Pro        Track income sources, pay frequency, and paycheck history
  OT Vault            Log overtime hours and calculate net after tax
  Freelance Flow      Manage freelance jobs, invoices, and payouts
  Bills               Track recurring bills and due dates
  Subscriptions       Manage subscriptions with renewal dates
  Expenses            Log and categorize monthly spending
  Debt Payoff         Track debt balances with snowball/avalanche strategies
  Savings             Set savings goals and track contributions
  Budget              Set spending limits by category
  Reports             Income, expense, financial health score, and ratios
  Calendar View       See all bills, paydays, and deadlines in one calendar
  Garage              Vehicle records, service logs, and renewal reminders
  News                Admin broadcast board for announcements
  Quick Math          Fast calculator widget on the dashboard
  Vault Style         Theme switcher (10 themes)


RUNNING WITH DOCKER (recommended)
----------------------------------
1. Pull the image:
   docker pull ghcr.io/k0-p0/monolith:latest

2. Run it:
   docker run -d \
     --restart=always \
     -p 80:80 \
     -v monolith_storage:/app/storage \
     --name monolith \
     ghcr.io/k0-p0/monolith:latest

3. Open http://localhost in your browser.
   The first account you register becomes the admin.

Your data is stored in the Docker volume "monolith_storage" and survives
container restarts and image updates.


USEFUL DOCKER COMMANDS
-----------------------
  Stop:     docker stop monolith
  Start:    docker start monolith
  Restart:  docker restart monolith
  Logs:     docker logs -f monolith


UPDATING TO A NEW VERSION
--------------------------
  docker pull ghcr.io/k0-p0/monolith:latest
  docker stop monolith && docker rm monolith
  docker run -d --restart=always -p 80:80 -v monolith_storage:/app/storage --name monolith ghcr.io/k0-p0/monolith:latest

Your data in the volume is untouched during updates.


RUNNING WITHOUT DOCKER (dev mode)
-----------------------------------
  cd Code/
  python -m venv venv && source venv/bin/activate
  pip install -r requirements.txt
  bash run.sh


SECURITY NOTES
--------------
- All user data is encrypted at rest using Fernet (AES-128-CBC + HMAC)
- Passwords are hashed with bcrypt
- TOTP 2FA is required for every account — it cannot be skipped
- Rate limiting on login and TOTP endpoints (SQLite-backed, multi-worker safe)
- TOTP replay protection prevents code reuse within the 90-second window
- Session cookies are HttpOnly, SameSite=Lax, and Secure when behind HTTPS
- Security events are logged to security.log


BUILT WITH
----------
  Python / Flask / Gunicorn / Nginx
  SQLite (WAL mode)
  cryptography (Fernet)
  bcrypt
  pyotp / qrcode

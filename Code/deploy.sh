#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
OWNER="$(stat -c %U "$DIR")"

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run this with sudo"
    exit 1
fi

echo "==> Installing Gunicorn into venv..."
sudo -u "$OWNER" "$DIR/venv/bin/pip" install gunicorn --quiet

echo "==> Installing systemd service..."
sed -e "s|__INSTALL_DIR__|$DIR|g" -e "s|__SERVICE_USER__|$OWNER|g" \
    "$DIR/vault.service" > /etc/systemd/system/vault.service
systemctl daemon-reload
systemctl enable vault
systemctl start vault

echo ""
echo "Done. Monolith is live on port 80."
echo ""
echo "  Status:  systemctl status vault"
echo "  Logs:    journalctl -u vault -f"
echo "  Restart: systemctl restart vault"

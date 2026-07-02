#!/bin/bash
# Run with: sudo bash deploy.sh
# Sets up Gunicorn for Vault v5 on a fresh machine.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run this with sudo"
    exit 1
fi

echo "==> Installing Gunicorn into venv..."
sudo -u kopo "$DIR/venv/bin/pip" install gunicorn --quiet

echo "==> Installing systemd service..."
cp "$DIR/vault.service" /etc/systemd/system/vault.service
systemctl daemon-reload
systemctl enable vault
systemctl start vault

echo ""
echo "Done. Vault is live on port 80."
echo ""
echo "  Status:  systemctl status vault"
echo "  Logs:    journalctl -u vault -f"
echo "  Restart: systemctl restart vault"

#!/bin/bash
# Run with: sudo bash deploy.sh
# Sets up Nginx + Gunicorn for Vault v5 on a fresh machine.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run this with sudo"
    exit 1
fi

echo "==> Installing Nginx..."
apt-get update -qq
apt-get install -y nginx

echo "==> Installing Gunicorn into venv..."
sudo -u kopo "$DIR/venv/bin/pip" install gunicorn --quiet

echo "==> Setting up Nginx site..."
cp "$DIR/nginx/vault.conf" /etc/nginx/sites-available/vault
ln -sf /etc/nginx/sites-available/vault /etc/nginx/sites-enabled/vault
# Remove the default placeholder site so port 80 belongs to Vault
rm -f /etc/nginx/sites-enabled/default

echo "==> Testing Nginx config..."
nginx -t

echo "==> Installing systemd service..."
cp "$DIR/vault.service" /etc/systemd/system/vault.service
systemctl daemon-reload
systemctl enable vault
systemctl start vault

echo "==> Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

echo ""
echo "Done. Vault is live on port 80."
echo ""
echo "  Status:  systemctl status vault"
echo "  Logs:    journalctl -u vault -f"
echo "  Nginx:   systemctl status nginx"
echo "  Restart: systemctl restart vault"

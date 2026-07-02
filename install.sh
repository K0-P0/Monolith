#!/bin/bash
set -e

echo ""
echo "  Monolith — Install Script"
echo "  ========================="
echo ""

if [ "$(id -u)" -ne 0 ]; then
    echo "  ERROR: Run this script with sudo"
    echo "  Usage: sudo bash install.sh"
    echo ""
    exit 1
fi

DIR="$(cd "$(dirname "$0")" && pwd)"
CODE="$DIR/Code"

echo "  [1/5] Unzipping files..."
cd "$CODE"

[ -f plugins.zip ] && unzip -qo plugins.zip && rm plugins.zip
[ -f static.zip ]  && unzip -qo static.zip  && rm static.zip

echo "  [2/5] Installing system dependencies..."
apt-get update -qq
apt-get install -y python3 python3-venv python3-pip unzip

echo "  [3/5] Setting up Python environment..."
python3 -m venv "$CODE/venv"
"$CODE/venv/bin/pip" install -q -r "$CODE/requirements.txt"

echo "  [4/5] Running deploy..."
bash "$CODE/deploy.sh"

echo "  [5/5] Setting up runM command..."
cat > /usr/local/bin/runM << 'RUNM'
#!/bin/bash
case "$1" in
  start)   sudo systemctl start vault;   echo "Monolith is running at http://localhost" ;;
  stop)    sudo systemctl stop vault;    echo "Stopped." ;;
  restart) sudo systemctl restart vault; echo "Restarted." ;;
  status)  systemctl status vault --no-pager ;;
  *)       echo "Usage: runM start | stop | restart | status" ;;
esac
RUNM
chmod +x /usr/local/bin/runM

echo ""
echo "  Done. Monolith is live."
echo ""
echo "  Open http://$(hostname -I | awk '{print $1}') in your browser."
echo "  The first account you register becomes the admin."
echo ""
echo "  Commands:"
echo "    runM start | stop | restart | status"
echo ""

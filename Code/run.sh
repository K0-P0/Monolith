#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/venv/bin/activate"
cd "$DIR"
exec env VAULT_COOKIE_SECURE=false \
    gunicorn --bind 127.0.0.1:5000 --workers 1 --reload server:app

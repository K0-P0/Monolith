#!/bin/bash
# Dev launcher — runs Gunicorn locally without Nginx.
# VAULT_COOKIE_SECURE=false lets the session cookie work over plain HTTP.
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$DIR/venv/bin/activate"
cd "$DIR"
exec env VAULT_COOKIE_SECURE=false \
    gunicorn --bind 0.0.0.0:5000 --workers 1 --reload server:app

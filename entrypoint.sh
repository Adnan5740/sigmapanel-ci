#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p data
PYTHON="$(dirname "$0")/venv/bin/python3"
UVICORN="$(dirname "$0")/venv/bin/uvicorn"
BASE="$(dirname "$0")"

for proc in smpp_server.py worker.py smpp_client_manager.py; do
    pkill -f "${BASE}/${proc}" 2>/dev/null || true
done
sleep 1

cleanup() {
    for proc in smpp_server.py worker.py smpp_client_manager.py; do
        pkill -f "${BASE}/${proc}" 2>/dev/null || true
    done
}
trap cleanup EXIT TERM INT

"$PYTHON" smpp_server.py &
"$PYTHON" worker.py &
"$PYTHON" smpp_client_manager.py &
exec "$UVICORN" main:app --host 127.0.0.1 --port "${PORT:-8000}" \
    --proxy-headers --forwarded-allow-ips='127.0.0.1'

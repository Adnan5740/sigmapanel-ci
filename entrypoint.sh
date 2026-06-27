#!/bin/bash
set -e

# Ensure data directory exists
mkdir -p data

# Start SMPP Server in background
python3 smpp_server.py &

# Start Worker in background
python3 worker.py &

# Start SMPP Client Manager (outbound provider connections)
python3 smpp_client_manager.py &

# Start FastAPI application (foreground — keeps container alive)
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"

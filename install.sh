#!/bin/bash
# SIGMAPANEL installer — safe to run over SSH (uses nohup+tmux guard)
# Re-run anytime to update. Panel keeps running if SSH drops.

set -e

INSTALL_DIR="/var/www/sigmapanel"
SERVICE_USER="sigmapanel"
PORT="${PORT:-8000}"

# ── If not already in a detached context, re-launch inside tmux ──────────────
if [ -z "$SIGMAPANEL_INSTALL_DETACHED" ]; then
    if command -v tmux &>/dev/null; then
        echo "[*] Launching installer in tmux session 'sigmapanel-install'..."
        tmux new-session -d -s sigmapanel-install \
            "SIGMAPANEL_INSTALL_DETACHED=1 bash $(realpath "$0") 2>&1 | tee /tmp/sigmapanel-install.log"
        echo "[*] Installer running in background. Attach with:"
        echo "      tmux attach -t sigmapanel-install"
        echo "    Or tail logs with:"
        echo "      tail -f /tmp/sigmapanel-install.log"
        exit 0
    else
        # Fallback: just continue (user may already be in screen/nohup)
        export SIGMAPANEL_INSTALL_DETACHED=1
    fi
fi

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== SIGMAPANEL Installer ==="

# ── System packages ───────────────────────────────────────────────────────────
log "Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv redis-server git curl tmux 2>/dev/null

# ── Service user ──────────────────────────────────────────────────────────────
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --no-create-home --shell /bin/false "$SERVICE_USER"
    log "Created service user: $SERVICE_USER"
fi

# ── Clone / update repo ───────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
    log "Updating existing install..."
    git -C "$INSTALL_DIR" pull --rebase 2>&1 | tail -3
elif [ -d "$INSTALL_DIR" ] && [ "$(ls -A $INSTALL_DIR)" ]; then
    log "Directory exists (non-git). Copying files..."
    cp -r "$(dirname "$(realpath "$0")")/." "$INSTALL_DIR/"
else
    log "Copying files to $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
    cp -r "$(dirname "$(realpath "$0")")/." "$INSTALL_DIR/"
fi

# ── Python venv + deps ────────────────────────────────────────────────────────
log "Setting up Python virtualenv..."
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --quiet --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install --quiet -r "$INSTALL_DIR/requirements.txt"
log "Python dependencies installed."

# ── Data directory ────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR/data"
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
chmod +x "$INSTALL_DIR/entrypoint.sh"

# ── Redis ─────────────────────────────────────────────────────────────────────
systemctl enable redis-server --quiet 2>/dev/null || true
systemctl start  redis-server 2>/dev/null || true

# ── entrypoint.sh — use venv python ──────────────────────────────────────────
cat > "$INSTALL_DIR/entrypoint.sh" << 'EOF'
#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p data
PYTHON="$(dirname "$0")/venv/bin/python3"
UVICORN="$(dirname "$0")/venv/bin/uvicorn"

"$PYTHON" smpp_server.py &
"$PYTHON" worker.py &
"$PYTHON" smpp_client_manager.py &
exec "$UVICORN" main:app --host 0.0.0.0 --port "${PORT:-8000}"
EOF
chmod +x "$INSTALL_DIR/entrypoint.sh"

# ── systemd service ───────────────────────────────────────────────────────────
log "Writing systemd service..."
cat > /etc/systemd/system/sigmapanel.service << EOF
[Unit]
Description=SIGMAPANEL SMS Management Platform
After=network.target redis-server.service
Wants=redis-server.service

[Service]
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="DATABASE_URL=data/sigmapanel.db"
Environment="REDIS_URL=redis://127.0.0.1:6379/0"
Environment="PORT=$PORT"
ExecStart=$INSTALL_DIR/entrypoint.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
KillMode=process

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sigmapanel --quiet

# Restart if already running, otherwise start fresh
if systemctl is-active --quiet sigmapanel; then
    log "Restarting sigmapanel service..."
    systemctl restart sigmapanel
else
    log "Starting sigmapanel service..."
    systemctl start sigmapanel
fi

sleep 3

if systemctl is-active --quiet sigmapanel; then
    IP=$(hostname -I | awk '{print $1}')
    log "✓ SIGMAPANEL is running at http://$IP:$PORT"
    log "  Logs:    journalctl -u sigmapanel -f"
    log "  Status:  systemctl status sigmapanel"
    log "  Restart: systemctl restart sigmapanel"
else
    log "✗ Service failed to start. Check logs:"
    journalctl -u sigmapanel -n 30 --no-pager
    exit 1
fi

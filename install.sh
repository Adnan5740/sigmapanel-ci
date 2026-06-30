#!/bin/bash
# SIGMAPANEL installer — safe to run over SSH (uses nohup+tmux guard)
# Re-run anytime to update. Panel keeps running if SSH drops.

set -e

INSTALL_DIR="/var/www/sigmapanel"
SERVICE_USER="sigmapanel"
PORT="${PORT:-8000}"
NGINX_SITE="/etc/nginx/sites-available/sigmapanel"
NGINX_LIMITS="/etc/nginx/conf.d/sigmapanel-limits.conf"

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
apt-get install -y -qq python3 python3-pip python3-venv redis-server git curl tmux nginx ufw 2>/dev/null

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
exec "$UVICORN" main:app --host 127.0.0.1 --port "${PORT:-8000}" \
    --proxy-headers --forwarded-allow-ips='127.0.0.1'
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
Environment="TRUST_PROXY_HEADERS=true"
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

# ── Nginx reverse proxy (port 80 → FastAPI on 127.0.0.1:8000) ────────────────
log "Configuring Nginx reverse proxy..."

cat > "$NGINX_LIMITS" << 'NGINX_LIMITS_EOF'
# SIGMAPANEL — shared Nginx limits (http context)
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      "";
}

limit_req_zone $binary_remote_addr zone=sigmapanel:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=sigmapanel_conn:10m;
NGINX_LIMITS_EOF

cat > "$NGINX_SITE" << NGINX_SITE_EOF
# SIGMAPANEL — Nginx reverse proxy (VPS IP access, no domain required)
# Access via: http://YOUR_VPS_IP

upstream sigmapanel_backend {
    server 127.0.0.1:$PORT;
    keepalive 32;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 25m;
    client_body_timeout 60s;
    client_header_timeout 60s;
    send_timeout 60s;
    keepalive_timeout 65;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types
        text/plain text/css text/javascript application/javascript
        application/json application/xml image/svg+xml;

    location / {
        proxy_pass http://sigmapanel_backend;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;

        limit_req zone=sigmapanel burst=50 nodelay;
        limit_conn sigmapanel_conn 50;
    }

    location = /health {
        proxy_pass http://sigmapanel_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
}
NGINX_SITE_EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/sigmapanel
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx --quiet
systemctl restart nginx

# ── Firewall — expose 80 + SSH only; keep FastAPI internal ─────────────────
log "Configuring UFW firewall..."
if command -v ufw &>/dev/null; then
    ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1 || true
    ufw allow 80/tcp comment 'SIGMAPANEL HTTP' >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    ufw deny "$PORT/tcp" >/dev/null 2>&1 || true
    log "UFW: allowed SSH + port 80; denied public access to port $PORT"
fi

# Restart if already running, otherwise start fresh
if systemctl is-active --quiet sigmapanel; then
    log "Restarting sigmapanel service..."
    systemctl restart sigmapanel
else
    log "Starting sigmapanel service..."
    systemctl start sigmapanel
fi

sleep 3

if systemctl is-active --quiet sigmapanel && systemctl is-active --quiet nginx; then
    IP=$(hostname -I | awk '{print $1}')

    # ── Validation ──────────────────────────────────────────────────────────
    log "Validating deployment..."
    VALID=1
    curl -sf --max-time 10 "http://127.0.0.1/health" >/dev/null || { log "✗ /health check failed"; VALID=0; }
    curl -sf --max-time 10 -o /dev/null "http://127.0.0.1/static/css/style.css" || { log "✗ Static assets check failed"; VALID=0; }
    HTTP_ROOT=$(curl -sf --max-time 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1/" || echo "000")
    if [ "$HTTP_ROOT" != "200" ]; then
        log "✗ Root page returned HTTP $HTTP_ROOT (expected 200)"
        VALID=0
    fi

    if [ "$VALID" -eq 1 ]; then
        log "✓ SIGMAPANEL is running at http://$IP"
        log "  Backend: 127.0.0.1:$PORT (internal, not exposed)"
        log "  Nginx:   port 80 → FastAPI (use IP only, no domain needed)"
        log "  Logs:    journalctl -u sigmapanel -f"
        log "  Status:  systemctl status sigmapanel nginx"
        log "  Restart: systemctl restart sigmapanel nginx"
    else
        log "✗ Validation failed. Check logs:"
        journalctl -u sigmapanel -n 20 --no-pager
        journalctl -u nginx -n 20 --no-pager
        exit 1
    fi
else
    log "✗ Service failed to start. Check logs:"
    systemctl is-active --quiet sigmapanel || journalctl -u sigmapanel -n 30 --no-pager
    systemctl is-active --quiet nginx || journalctl -u nginx -n 30 --no-pager
    exit 1
fi

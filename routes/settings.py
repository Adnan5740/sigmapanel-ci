"""Settings routes - webhook config, system IP/port, user preferences"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os, socket
from database import get_db, get_db_path
from audit_utils import log_audit
from auth import verify_token, extract_token, generate_id
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingCreate(BaseModel):
    key: str
    value: str
    userId: Optional[str] = None

@router.get("")
async def list_settings(request: Request, key: str = Query(None)):
    PUBLIC_KEYS = {'signup_enabled', 'contact_whatsapp', 'contact_teams', 'contact_telegram'}
    auth_header = request.headers.get("Authorization")
    tok = extract_token(auth_header) if auth_header else None
    p = verify_token(tok) if tok else None

    if not p and key not in PUBLIC_KEYS:
        raise HTTPException(status_code=401, detail="Authentication required")

    conds, params = [], []
    if p and p["role"] != "admin":
        conds.append("(user_id IS NULL OR user_id = ?)"); params.append(p["id"])
    elif not p:
        conds.append("user_id IS NULL")
    if key:
        conds.append("setting_key = ?"); params.append(key)
    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM settings WHERE {where} ORDER BY setting_key", params).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("")
async def upsert_setting(request: Request, body: SettingCreate, p=Depends(get_current_user)):
    uid = body.userId if p["role"] == "admin" else p["id"]
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM settings WHERE setting_key=? AND (user_id=? OR (user_id IS NULL AND ? IS NULL))",
            (body.key, uid, uid),
        ).fetchone()
        if existing:
            conn.execute("UPDATE settings SET setting_value=? WHERE id=?", (body.value, existing["id"]))
            row = conn.execute("SELECT * FROM settings WHERE id=?", (existing["id"],)).fetchone()
        else:
            sid = generate_id()
            conn.execute("INSERT INTO settings (id,setting_key,setting_value,user_id) VALUES (?,?,?,?)",
                         (sid, body.key, body.value, uid))
            row = conn.execute("SELECT * FROM settings WHERE id=?", (sid,)).fetchone()
    return {"data": dict(row)}

@router.get("/webhook-info")
async def webhook_info(request: Request, p=Depends(get_current_user)):
    """Returns server IP, port and webhook URL — shown in settings page"""
    host = request.headers.get("host", "")
    # Detect public IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        server_ip = s.getsockname()[0]
        s.close()
    except Exception:
        server_ip = "127.0.0.1"

    port = os.environ.get("PORT", "8000")
    scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"

    # Use the actual host from request if available (e.g. Railway domain)
    if host and "." in host:
        base_url = f"{scheme}://{host}"
    else:
        base_url = f"http://{server_ip}:{port}"

    return {
        "serverIp": server_ip,
        "port": port,
        "baseUrl": base_url,
        "webhookUrl": f"{base_url}/api/webhook/sms",
        "method": "POST",
        "contentType": "application/json",
        "fields": {
            "to":   "Destination number (international format: +525529001312)",
            "from": "Service name / sender",
            "msg":  "Message body",
            "uuid": "Unique message ID",
        },
        "example": {
            "to": "+525529001312",
            "from": "AmericanExpress",
            "msg": "Your OTP is 847291",
            "uuid": "msg-204953",
        },
    }


@router.get("/payout-rates")
async def get_payout_rates(p=Depends(get_current_user)):
    keys = {"payout_rate_weekly": "0.85", "payout_rate_monthly": "0.75"}
    with get_db() as conn:
        rows = conn.execute(
            "SELECT setting_key, setting_value FROM settings WHERE user_id IS NULL AND setting_key IN ('payout_rate_weekly','payout_rate_monthly')"
        ).fetchall()
    values = dict(keys)
    for row in rows:
        values[row["setting_key"]] = row["setting_value"]
    return {"weekly": float(values["payout_rate_weekly"]), "monthly": float(values["payout_rate_monthly"])}

@router.put("/payout-rates")
async def update_payout_rates(body: dict, p=Depends(require_role(["admin", "manager"]))):
    try:
        weekly = float(body.get("weekly"))
        monthly = float(body.get("monthly"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Weekly and monthly rates must be numeric")
    if weekly < 0 or monthly < 0:
        raise HTTPException(400, "Rates cannot be negative")
    with get_db() as conn:
        for key, value in (("payout_rate_weekly", weekly), ("payout_rate_monthly", monthly)):
            existing = conn.execute("SELECT id FROM settings WHERE setting_key=? AND user_id IS NULL", (key,)).fetchone()
            if existing:
                conn.execute("UPDATE settings SET setting_value=? WHERE id=?", (str(value), existing["id"]))
            else:
                conn.execute("INSERT INTO settings (id, setting_key, setting_value, user_id) VALUES (?,?,?,NULL)", (generate_id(), key, str(value)))
    return {"weekly": weekly, "monthly": monthly}

@router.post("/backup")
async def backup_database(p=Depends(require_role(["admin"]))):
    import shutil
    import datetime
    try:
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"database_backup_{ts}.sqlite"
        shutil.copy2(get_db_path(), backup_file)

        with get_db() as conn:
            log_audit(conn, p, 'system_backup', 'backup', backup_file, f"Backup created: {backup_file}", None)

        return {"message": "Backup created successfully", "file": backup_file}
    except Exception as e:
        raise HTTPException(500, str(e))

"""SMPP Interconnection and Server Management APIs"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from database import get_db
from routes.deps import get_current_user, require_role
from auth import generate_id
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/smpp-interconnect", tags=["smpp-interconnect"])

# --- Client (Remote Servers) ---
@router.get("/servers")
async def list_servers(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_remote_servers ORDER BY priority DESC").fetchall()
    data = []
    for row in rows:
        item = dict(row)
        raw_status = item.get("status") or "pending"
        if not item.get("is_active"):
            item["status"] = "inactive"
        elif raw_status in ("connected", "bound"):
            item["status"] = "connected"
        elif raw_status in ("failed", "disconnected", "error"):
            item["status"] = "error"
        else:
            item["status"] = "pending"
        item["last_event_at"] = item.get("last_connected") or item.get("last_disconnected")
        item["last_event_detail"] = item.get("last_error") or raw_status
        data.append(item)
    return {"data": data}

@router.post("/servers")
async def create_server(body: dict, p=Depends(require_role(["admin", "manager"]))):
    # Validate provider connection (requires host and port)
    connection_type = body.get("connection_type", "provider_connection")
    
    if connection_type == "provider_connection":
        # Provider connection requires Host/IP and Port
        host = body.get("host", "").strip()
        port = body.get("port")
        
        if not host:
            raise HTTPException(400, "Host/IP is required for provider connection")
        if not port or port < 1 or port > 65535:
            raise HTTPException(400, "Valid port (1-65535) is required for provider connection")
    
    # Validate common fields
    system_id = body.get("system_id", "").strip()
    password = body.get("password", "").strip()
    
    if not system_id:
        raise HTTPException(400, "System ID is required")
    if not password:
        raise HTTPException(400, "Password is required")
    
    with get_db() as conn:
        sid = generate_id()
        name = body.get("name") or f"{body.get('system_id')}-{connection_type}"
        
        conn.execute(
            """INSERT INTO smpp_remote_servers
               (id, name, host, port, system_id, password, bind_type, is_active, priority,
                status, throughput_limit, src_ton, src_npi, dst_ton, dst_npi,
                enquire_link_interval, dlr_enabled, allowed_ips)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (sid, name, body.get("host", ""), int(body.get("port", 0)) if body.get("port") else 0,
             system_id, password, body.get("bind_type", "transceiver"),
             1, int(body.get("priority", 1)), "pending", int(body.get("throughput_limit", 10)),
             int(body.get("src_ton", 1)), int(body.get("src_npi", 1)),
             int(body.get("dst_ton", 1)), int(body.get("dst_npi", 1)),
             int(body.get("enquire_link_interval", 30)), 1 if body.get("dlr_enabled", 1) else 0,
             body.get("allowed_ips"))
        )
    return {"message": "Provider connection configured", "id": sid}

@router.post("/servers/{sid}/toggle")
async def toggle_server(sid: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        current = conn.execute("SELECT is_active FROM smpp_remote_servers WHERE id=?", (sid,)).fetchone()
        if not current:
            raise HTTPException(404, "Server not found")
        new_val = 0 if current["is_active"] else 1
        next_status = "pending" if new_val else "inactive"
        conn.execute("UPDATE smpp_remote_servers SET is_active=?, status=? WHERE id=?", (new_val, next_status, sid))
    return {"message": "Toggled", "is_active": new_val}

@router.delete("/servers/{sid}")
async def delete_server(sid: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM smpp_remote_servers WHERE id=?", (sid,))
    return {"message": "Server deleted"}

# --- Server (Provider Accounts) ---
@router.get("/accounts")
async def list_server_accounts(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT id, system_id, company, status, throughput_limit, max_sessions, ip_whitelist, created_at FROM smpp_server_accounts").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/accounts")
async def create_server_account(body: dict, p=Depends(require_role(["admin"]))):
    # Account creation does NOT require Host/IP and Port
    system_id = body.get("system_id", "").strip()
    password = body.get("password", "").strip()
    
    if not system_id:
        raise HTTPException(400, "System ID is required")
    if not password:
        raise HTTPException(400, "Password is required")
    
    with get_db() as conn:
        # Check if system_id already exists
        if conn.execute("SELECT 1 FROM smpp_server_accounts WHERE system_id=?", (system_id,)).fetchone():
            raise HTTPException(409, "System ID already exists")
        
        aid = generate_id()
        conn.execute("""INSERT INTO smpp_server_accounts (id, system_id, password, company, status, throughput_limit, max_sessions, ip_whitelist)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (aid, system_id, password, body.get("company", ""), 'active', 
                      max(1, int(body.get("throughput_limit", 10))), 
                      max(1, int(body.get("max_sessions", 5))), 
                      body.get("ip_whitelist", "")))
    return {"message": "SMPP account created", "id": aid}

@router.put("/accounts/{aid}")
async def update_server_account(aid: str, body: dict, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        fields = ['system_id', 'password', 'company', 'status', 'throughput_limit', 'max_sessions', 'ip_whitelist']
        upd = {f: body[f] for f in fields if f in body}
        if upd:
            conn.execute(f"UPDATE smpp_server_accounts SET {','.join(f'{k}=?' for k in upd)} WHERE id=?", list(upd.values()) + [aid])
    return {"message": "Account updated"}

@router.delete("/accounts/{aid}")
async def delete_server_account(aid: str, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM smpp_server_accounts WHERE id=?", (aid,))
    return {"message": "Account deleted"}

# --- Monitoring ---
@router.get("/server-sessions")
async def get_server_sessions(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_server_sessions").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/server-logs")
async def get_server_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_server_logs ORDER BY created_at DESC LIMIT 200").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/dlr-logs")
async def get_dlr_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT received_at, number, otp, service, profit FROM sms_received WHERE otp IS NOT NULL ORDER BY received_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/failed-packets")
async def get_failed_packets(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_failed_packets ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/stats")
async def get_smpp_stats(p=Depends(require_role(["admin", "manager"]))):
    minute_start = (datetime.utcnow() - timedelta(minutes=1)).isoformat()
    with get_db() as conn:
        sessions = conn.execute("SELECT COUNT(*) FROM smpp_server_sessions").fetchone()[0]
        remote_total = conn.execute("SELECT COUNT(*) FROM smpp_remote_servers").fetchone()[0]
        remote_enabled = conn.execute("SELECT COUNT(*) FROM smpp_remote_servers WHERE is_active=1").fetchone()[0]
        msg_today = conn.execute("SELECT COUNT(*) FROM sms_received WHERE received_at >= date('now')").fetchone()[0]
        msg_minute = conn.execute("SELECT COUNT(*) FROM sms_received WHERE received_at >= ?", (minute_start,)).fetchone()[0]
        dlr_today = conn.execute("SELECT COUNT(*) FROM sms_received WHERE otp IS NOT NULL AND received_at >= date('now')").fetchone()[0]
        fails = conn.execute("SELECT COUNT(*) FROM smpp_server_logs WHERE event_type='BIND_FAILURE' AND created_at >= date('now')").fetchone()[0]
    return {
        "active_sessions": sessions,
        "remote_total": remote_total,
        "remote_enabled": remote_enabled,
        "sms_received": msg_today,
        "dlrs_processed": dlr_today,
        "failed_binds": fails,
        "throughput": round(msg_minute / 60.0, 2)
    }

@router.get("/logs")
async def get_smpp_logs(p=Depends(require_role(["admin", "manager"]))):
    """General SMPP event logs — alias for server-logs, used by frontend /api/smpp-interconnect/logs."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_server_logs ORDER BY created_at DESC LIMIT 200").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/test-connection")
async def test_smpp_connection(body: dict, p=Depends(require_role(["admin", "manager"]))):
    """TCP probe to check if a remote SMPP server is reachable."""
    import socket as _sock
    host = body.get("host", "")
    port = int(body.get("port", 2775))
    if not host:
        raise HTTPException(400, "host is required")
    try:
        s = _sock.create_connection((host, port), timeout=5)
        s.close()
        return {"status": "reachable", "host": host, "port": port}
    except Exception as e:
        return {"status": "unreachable", "host": host, "port": port, "error": str(e)}

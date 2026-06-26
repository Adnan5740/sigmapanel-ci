"""Security and Firewall Management routes."""
import ipaddress
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from auth import generate_id
from database import get_db
from routes.deps import require_role

router = APIRouter(prefix="/api/security", tags=["security"])


class BlockIPRequest(BaseModel):
    ip: str = Field(..., min_length=3, max_length=64)
    reason: Optional[str] = Field(default="Manual block", max_length=240)
    days: Optional[int] = Field(default=30, ge=1, le=365)


def _validate_ip(ip: str) -> str:
    candidate = (ip or "").strip()
    try:
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")


def _threat_score(event_count: int, critical_count: int, blocked_count: int) -> str:
    if critical_count >= 5 or event_count >= 100 or blocked_count >= 25:
        return "HIGH"
    if critical_count >= 1 or event_count >= 25 or blocked_count >= 5:
        return "MEDIUM"
    return "LOW"


@router.get("/events")
async def list_security_events(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = Query(None, max_length=80),
    severity: Optional[str] = Query(None, max_length=20),
    ip: Optional[str] = Query(None, max_length=64),
    p=Depends(require_role(["admin"])),
):
    clauses = []
    params = []
    if event_type:
        clauses.append("event_type = ?")
        params.append(event_type.strip())
    if severity:
        clauses.append("severity = ?")
        params.append(severity.strip())
    if ip:
        clauses.append("ip_address = ?")
        params.append(_validate_ip(ip))
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM security_events{where} ORDER BY datetime(created_at) DESC LIMIT ?",
            (*params, limit),
        ).fetchall()
    return {"data": [dict(r) for r in rows]}


@router.get("/blocked-ips")
async def list_blocked_ips(request: Request, p=Depends(require_role(["admin"]))):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at <= ?", (now,))
        rows = conn.execute("SELECT * FROM blocked_ips ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}


@router.post("/block-ip")
async def block_ip(request: Request, body: BlockIPRequest, p=Depends(require_role(["admin"]))):
    ip = _validate_ip(body.ip)
    expires = (datetime.utcnow() + timedelta(days=body.days or 30)).isoformat()
    reason = (body.reason or "Manual block").strip()[:240]
    with get_db() as conn:
        conn.execute(
            """INSERT INTO blocked_ips (id, ip_address, reason, expires_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(ip_address) DO UPDATE SET reason=excluded.reason, expires_at=excluded.expires_at""",
            (generate_id(), ip, reason, expires),
        )
        conn.execute(
            """INSERT INTO security_events (id, ip_address, event_type, severity, action_taken, detail)
               VALUES (?, ?, 'MANUAL_IP_BLOCK', 'high', 'blocked', ?)""",
            (generate_id(), ip, f"Blocked by {p.get('username', 'admin')}: {reason}"),
        )
    return {"message": f"IP {ip} blocked until {expires}", "ip": ip, "expires_at": expires}


@router.post("/unblock-ip/{ip}")
async def unblock_ip(request: Request, ip: str, p=Depends(require_role(["admin"]))):
    clean_ip = _validate_ip(ip)
    with get_db() as conn:
        conn.execute("DELETE FROM blocked_ips WHERE ip_address = ?", (clean_ip,))
        conn.execute(
            """INSERT INTO security_events (id, ip_address, event_type, severity, action_taken, detail)
               VALUES (?, ?, 'MANUAL_IP_UNBLOCK', 'info', 'unblocked', ?)""",
            (generate_id(), clean_ip, f"Unblocked by {p.get('username', 'admin')}"),
        )
    return {"message": f"IP {clean_ip} unblocked", "ip": clean_ip}


@router.get("/stats")
async def security_stats(request: Request, p=Depends(require_role(["admin"]))):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute("DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at <= ?", (now,))
        blocked_count = conn.execute("SELECT COUNT(*) FROM blocked_ips").fetchone()[0]
        event_count = conn.execute(
            "SELECT COUNT(*) FROM security_events WHERE datetime(created_at) >= datetime('now', '-1 day')"
        ).fetchone()[0]
        critical_count = conn.execute(
            """SELECT COUNT(*) FROM security_events
               WHERE datetime(created_at) >= datetime('now', '-1 day') AND severity IN ('high', 'critical')"""
        ).fetchone()[0]
        rate_limited = conn.execute(
            """SELECT COUNT(*) FROM security_events
               WHERE datetime(created_at) >= datetime('now', '-1 day') AND event_type = 'RATE_LIMIT'"""
        ).fetchone()[0]
        scanners = conn.execute(
            """SELECT COUNT(*) FROM security_events
               WHERE datetime(created_at) >= datetime('now', '-1 day')
                 AND event_type IN ('SCANNER_USER_AGENT', 'PROBE_REQUEST', 'BLOCKED_PATH')"""
        ).fetchone()[0]
    return {
        "threat_score": _threat_score(event_count, critical_count, blocked_count),
        "blocked_ips": blocked_count,
        "recent_events": event_count,
        "critical_events": critical_count,
        "rate_limited": rate_limited,
        "scanner_blocks": scanners,
    }

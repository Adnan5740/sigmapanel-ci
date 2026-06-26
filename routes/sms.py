"""SMS Reports routes"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from database import get_db
from auth import verify_token, extract_token
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/sms", tags=["sms"])

PRODUCTION_SMS = "number NOT IN (SELECT number FROM numbers WHERE status = 'test')"
TEST_SMS = "number IN (SELECT number FROM numbers WHERE status = 'test')"

@router.get("")
async def list_sms(
    request: Request,
    service: str = Query(None),
    number: str = Query(None),
    search: str = Query(None),
    sender: str = Query(None),
    dateFrom: str = Query(None, alias="from"),
    dateTo: str = Query(None, alias="to"),
    scope: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    p=Depends(get_current_user)
):
    offset = (page - 1) * limit
    conds, params = [], []
    role = p["role"]
    test_scope = scope == "test" or role == "test_user"

    if test_scope:
        if role not in ("admin", "manager", "test_user"):
            raise HTTPException(403, "Test SMS data is restricted to test accounts and admins")
        conds.append(TEST_SMS)
        if role == "test_user":
            conds.append("assigned_to = ?")
            params.append(p["username"])
    else:
        conds.append(PRODUCTION_SMS)
        if role == "sub_reseller":
            conds.append("assigned_to = ?")
            params.append(p["username"])
        elif role == "reseller":
            conds.append("(assigned_to = ? OR assigned_to IN (SELECT username FROM users WHERE parent_id = ?))")
            params.extend([p["username"], p["id"]])
        elif role == "test_user":
            raise HTTPException(403, "Use the test panel for test SMS reports")
    
    if service:
        conds.append("service LIKE ?"); params.append(f"%{service}%")
    if number:
        conds.append("number LIKE ?"); params.append(f"%{number}%")
    if sender:
        conds.append("sender LIKE ?"); params.append(f"%{sender}%")
    if dateFrom:
        conds.append("received_at >= ?"); params.append(dateFrom)
    if dateTo:
        conds.append("received_at <= ?"); params.append(dateTo + "T23:59:59")
    if search:
        conds.append("(message LIKE ? OR sender LIKE ? OR number LIKE ?)")
        params.extend([f"%{search}%"] * 3)
    
    where = " AND ".join(conds) if conds else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM sms_received WHERE {where} ORDER BY received_at DESC LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE {where}", params).fetchone()[0]
    
    return {
        "data": [dict(r) for r in rows],
        "pagination": { "total": total, "page": page, "limit": limit, "totalPages": (total + limit - 1) // limit, "hasMore": offset + limit < total }
    }

@router.get("/delivery-logs")
async def delivery_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute(
            f"SELECT * FROM sms_received WHERE otp IS NOT NULL AND {PRODUCTION_SMS} ORDER BY received_at DESC LIMIT 100"
        ).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/failed")
async def failed_sms(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, ip_address, event_type, severity, action_taken,
                   detail AS details, detail AS message, created_at
            FROM security_events
            WHERE event_type IN ('SMS_FAILED', 'WEBHOOK_ERROR', 'SMS_REJECTED')
               OR action_taken LIKE '%SMS%'
            ORDER BY created_at DESC
            LIMIT 100
        """).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/payout-stats")
async def payout_stats(p=Depends(get_current_user)):
    """Aggregate payout per range/number for the current user."""
    role = p["role"]
    username = p["username"]
    uid = p["id"]
    PROD = "number NOT IN (SELECT number FROM numbers WHERE status = 'test')"
    with get_db() as conn:
        if role in ("admin", "manager"):
            cond, params = PROD, []
        elif role == "sub_reseller":
            cond, params = f"{PROD} AND assigned_to=?", [username]
        elif role == "reseller":
            sub_users = [r["username"] for r in conn.execute(
                "SELECT username FROM users WHERE parent_id=?", (uid,)).fetchall()]
            names = [username] + sub_users
            ph = ",".join("?"*len(names))
            cond, params = f"{PROD} AND assigned_to IN ({ph})", names
        else:
            return {"data": [], "total": 0}

        rows = conn.execute(
            f"SELECT range_name, COUNT(*) as sms_count, COALESCE(SUM(profit),0) as total_payout "
            f"FROM sms_received WHERE {cond} GROUP BY range_name ORDER BY total_payout DESC",
            params
        ).fetchall()
        total = conn.execute(
            f"SELECT COALESCE(SUM(profit),0) FROM sms_received WHERE {cond}", params
        ).fetchone()[0]
    return {"data": [dict(r) for r in rows], "total": round(float(total), 6)}

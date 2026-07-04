"""Main Numbers Management routes"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import re
from datetime import datetime
from database import get_db
from auth import generate_id
from phone_utils import normalize_phone_number
from routes.deps import get_current_user, require_role
from audit_utils import log_audit

router = APIRouter(prefix="/api/numbers", tags=["numbers"])

class NumberCreate(BaseModel):
    number: str
    countryName: Optional[str] = "Unknown"
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    service: Optional[str] = None
    status: Optional[str] = "active"
    assignedTo: Optional[str] = None
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 100.0

@router.get("")
async def list_numbers(
    country: str = Query(None),
    service: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    rangeName: str = Query(None),
    assignedTo: str = Query(None),
    available: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    p=Depends(get_current_user)
):
    offset = (page - 1) * limit
    conds, params = ["status != ?"], ["test"]
    if status == "test":
        raise HTTPException(403, "Use the test number panel for test numbers")
    if p["role"] == "sub_reseller":
        conds.append("assigned_to = ?")
        params.append(p["username"])
    elif p["role"] == "reseller":
        conds.append("(assigned_to = ? OR assigned_to IN (SELECT username FROM users WHERE parent_id = ?))")
        params.extend([p["username"], p["id"]])

    if status: conds.append("status = ?"); params.append(status)
    if available in ("true", "1", "yes"):
        conds.append("(assigned_to IS NULL OR assigned_to='')")
    if rangeName:
        conds.append("range_name = ?"); params.append(rangeName)
    if service:
        conds.append("service LIKE ?"); params.append(f"%{service}%")
    if assignedTo and p["role"] in ("admin", "manager"):
        conds.append("assigned_to = ?"); params.append(assignedTo)
    if search: conds.append("(number LIKE ? OR country_name LIKE ?)"); params.extend([f"%{search}%"] * 2)

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT * FROM numbers WHERE {where} ORDER BY created_at DESC LIMIT ? OFFSET ?"
        rows = conn.execute(q, params + [limit, offset]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {where}", params).fetchone()[0]

    return {
        "data": [dict(r) for r in rows],
        "pagination": { "total": total, "page": page, "limit": limit, "totalPages": (total + limit - 1) // limit, "hasMore": offset + limit < total }
    }

@router.post("")
async def create_number(body: NumberCreate, p=Depends(require_role(["admin", "manager"]))):
    if body.status == "test":
        raise HTTPException(400, "Use the test number endpoint for test numbers")
    number = normalize_phone_number(body.number)
    if not number:
        raise HTTPException(400, "Phone number is required")
    with get_db() as conn:
        nid = generate_id()
        range_name = body.rangeName
        rate = body.rate
        profit_margin = body.profitMargin
        country = body.countryName
        if body.rangeId:
            rng = conn.execute("SELECT name, country_name, rate, profit_margin FROM ranges WHERE id=?", (body.rangeId,)).fetchone()
            if rng:
                range_name = range_name or rng["name"]
                country = country or rng["country_name"]
                rate = rate if rate is not None else rng["rate"]
                profit_margin = profit_margin if profit_margin is not None else rng["profit_margin"]
        cur = conn.execute("INSERT OR IGNORE INTO numbers (id,number,country_name,range_name,range_id,service,status,assigned_to,rate,profit_margin) VALUES (?,?,?,?,?,?,?,?,?,?)",
                     (nid, number, country, range_name, body.rangeId, body.service, body.status, body.assignedTo, rate, profit_margin))
        if cur.rowcount == 0:
            raise HTTPException(409, "Number already exists")
    return {"message": "Created", "id": nid}



class TestNumberCreate(BaseModel):
    number: str
    countryName: Optional[str] = "Unknown"
    rangeId: Optional[str] = None
    rangeName: Optional[str] = None
    service: Optional[str] = None

@router.get("/test")
async def list_test_numbers_endpoint(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("""
            SELECT n.*, COALESCE(n.range_name, r.name) AS display_range_name
            FROM numbers n
            LEFT JOIN ranges r ON r.id = n.range_id
            WHERE n.status='test'
            ORDER BY n.created_at DESC
        """).fetchall()
    data = []
    for row in rows:
        item = dict(row)
        item["range_name"] = item.pop("display_range_name")
        data.append(item)
    return {"data": data}

@router.get("/test-panel")
async def list_test_panel_numbers(p=Depends(get_current_user)):
    if p["role"] not in ("admin", "manager", "test_user"):
        raise HTTPException(403, "Permission denied")
    conds = ["n.status='test'"]
    params = []
    if p["role"] == "test_user":
        conds.append("(n.assigned_to = ? OR n.assigned_to IS NULL OR n.assigned_to = '')")
        params.append(p["username"])
    where = " AND ".join(conds)
    with get_db() as conn:
        # Auto-seed 5 test numbers if test_user has none yet
        if p["role"] == "test_user":
            existing = conn.execute(
                "SELECT COUNT(*) FROM numbers WHERE status='test' AND assigned_to=?",
                (p["username"],)
            ).fetchone()[0]
            if existing < 5:
                needed = 5 - existing
                candidates = conn.execute(
                    "SELECT id FROM numbers WHERE status='active' AND (assigned_to IS NULL OR assigned_to='') LIMIT ?",
                    (needed,)
                ).fetchall()
                for row in candidates:
                    conn.execute(
                        "UPDATE numbers SET status='test', assigned_to=?, assigned_at=datetime('now') WHERE id=?",
                        (p["username"], row["id"])
                    )
        rows = conn.execute(f"""
            SELECT n.*, COALESCE(n.range_name, r.name) AS display_range_name
            FROM numbers n
            LEFT JOIN ranges r ON r.id = n.range_id
            WHERE {where}
            ORDER BY datetime(n.created_at) DESC
        """, params).fetchall()
    data = []
    for row in rows:
        item = dict(row)
        item["range_name"] = item.pop("display_range_name")
        data.append(item)
    return {"data": data}

@router.post("/test")
async def create_test_number(body: TestNumberCreate, p=Depends(require_role(["admin", "manager"]))):
    number = normalize_phone_number(body.number)
    if not number:
        raise HTTPException(400, "Phone number is required")
    with get_db() as conn:
        nid = generate_id()
        range_name = body.rangeName
        if body.rangeId and not range_name:
            rng = conn.execute("SELECT name FROM ranges WHERE id=?", (body.rangeId,)).fetchone()
            range_name = rng["name"] if rng else None
        cur = conn.execute(
            "INSERT OR IGNORE INTO numbers (id, number, country_name, range_id, range_name, service, status) VALUES (?,?,?,?,?,?,?)",
            (nid, number, body.countryName, body.rangeId, range_name, body.service, "test")
        )
        if cur.rowcount == 0:
            return {"message": "Test number already exists", "added": 0, "skipped": 1}
    return {"message": "Test number created", "id": nid, "added": 1}

@router.post("/{item_id}/revoke")
async def revoke_number(item_id: str, request: Request, p=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT status, assigned_to FROM numbers WHERE id=?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Number not found")
        if row["status"] == "test":
            raise HTTPException(400, "Test numbers can only be managed from the test panel")
        if p["role"] not in ("admin", "manager") and row["assigned_to"] != p["username"]:
            raise HTTPException(403, "Permission denied")
        
        previous_owner = row["assigned_to"]
        
        # Update number assignment
        conn.execute("UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE id=?", (item_id,))
        
        # Mark active allocations as revoked
        conn.execute(
            "UPDATE allocations SET status='revoked', revoked_at=datetime('now') WHERE number_id=? AND status='active'",
            (item_id,)
        )
        
        # Reset number statistics
        conn.execute("UPDATE numbers SET total_sms=0, last_sms_at=NULL WHERE id=?", (item_id,))
        
        # Log the action
        detail = f"Number revoked from {previous_owner}" if previous_owner else "Number revoked (was unassigned)"
        log_audit(conn, p, "number_revoked", "number", item_id, detail, request)
        
    return {"message": "Revoked", "number": item_id, "previous_owner": previous_owner}

@router.delete("/{item_id}")
async def delete_number(item_id: str, p=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT status FROM numbers WHERE id=?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Number not found")
        if row["status"] == "test":
            if p["role"] not in ("admin", "manager"):
                raise HTTPException(403, "Permission denied")
        elif p["role"] != "admin":
            raise HTTPException(403, "Only admins can delete production numbers")
        conn.execute("DELETE FROM numbers WHERE id=?", (item_id,))
    return {"message": "Deleted"}

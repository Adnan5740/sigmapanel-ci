"""Extended numbers routes for bulk operations, allocation, and real exports"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from audit_utils import log_audit
from auth import generate_id
from phone_utils import normalize_phone_number
from routes.deps import get_current_user, require_role
from datetime import datetime
import re, io, csv
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter(prefix="/api/numbers-ext", tags=["numbers-ext"])


def _get_payout_rate_settings(conn):
    rows = conn.execute(
        "SELECT setting_key, setting_value FROM settings WHERE user_id IS NULL AND setting_key IN ('payout_rate_weekly','payout_rate_monthly')"
    ).fetchall()
    values = {r['setting_key']: r['setting_value'] for r in rows}
    def as_rate(key, default):
        try:
            value = float(values.get(key, default))
            return max(value, 0.0)
        except (TypeError, ValueError):
            return default
    return {"weekly": as_rate("payout_rate_weekly", 0.04), "monthly": as_rate("payout_rate_monthly", 0.03)}

class BulkImport(BaseModel):
    numbersText: str
    countryName: Optional[str] = "Unknown"
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 100.0

class BulkRevokeRequest(BaseModel):
    scope: Optional[str] = None  # global | user | range
    userId: Optional[str] = None
    rangeName: Optional[str] = None
    numberIds: Optional[list] = None  # explicit list of number IDs (from checkbox selection)
    action: Optional[str] = "revoke"  # revoke | return — both unassign the number

class BulkAllocateRequest(BaseModel):
    userId: str
    rangeName: str
    quantity: int
    profitMargin: Optional[float] = None

class AllocateNumbers(BaseModel):
    rangeName: str
    quantity: int
    duration: Optional[str] = "monthly"

@router.get("/export")
async def export_numbers(
    format: str = Query("csv"),
    rangeName: Optional[str] = Query(None),
    p=Depends(get_current_user)
):
    if p['role'] == 'test_user':
        raise HTTPException(403, "Test users cannot export numbers")
    if p['role'] not in ['admin', 'manager']:
        q = "SELECT number, range_name, country_name, status, assigned_at FROM numbers WHERE status != 'test' AND assigned_to = ?"
        params = [p['username']]
        if rangeName and rangeName != "all":
            q += " AND range_name = ?"
            params.append(rangeName)
    else:
        q = "SELECT number, range_name, country_name, status, assigned_to, assigned_at FROM numbers WHERE status != 'test'"
        params = []
        if rangeName and rangeName != "all":
            q += " AND range_name = ?"
            params.append(rangeName)

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()
        if not rows: raise HTTPException(404, "No numbers found")
        df = pd.DataFrame([dict(r) for r in rows])

    filename = f"export_{datetime.now().strftime('%Y%m%d')}"

    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return StreamingResponse(io.BytesIO(stream.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "txt":
        content = "\n".join(df['number'].tolist())
        return StreamingResponse(io.BytesIO(content.encode()), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={filename}.txt"})
    elif format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        return StreamingResponse(io.BytesIO(output.getvalue()), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        y = 750
        c.drawString(50, y, f"Numbers Export - {datetime.now().strftime('%Y-%m-%d')}")
        y -= 30
        for i, row in df.head(100).iterrows():
            c.drawString(50, y, f"{row['number']} | {row.get('range_name','-')}")
            y -= 15
            if y < 50: c.showPage(); y = 750
        c.save()
        return StreamingResponse(io.BytesIO(buffer.getvalue()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})

    raise HTTPException(400, "Unsupported format")

@router.post("/bulk-import")
async def bulk_import(body: BulkImport, request: Request, p=Depends(require_role(["admin", "manager", "test_user"]))):
    lines = [l.strip() for l in re.split(r'[\n,;]+', body.numbersText or '') if l.strip()]
    if not lines:
        raise HTTPException(400, "Please enter at least one number")
    success = 0
    skipped = 0
    with get_db() as conn:
        range_id = body.rangeId
        range_name = body.rangeName
        country = body.countryName
        rate = body.rate
        profit_margin = body.profitMargin
        if p['role'] != 'test_user':
            if not range_id and not range_name:
                raise HTTPException(400, "Please select a range before importing numbers")
            if range_id:
                rng = conn.execute("SELECT * FROM ranges WHERE id=?", (range_id,)).fetchone()
            else:
                rng = conn.execute("SELECT * FROM ranges WHERE name=?", (range_name,)).fetchone()
            if not rng:
                raise HTTPException(404, "Selected range not found")
            range_id = rng['id']
            range_name = rng['name']
            country = country or rng['country_name'] or 'Global'
            rate = rng['rate'] if rate is None else rate
            profit_margin = rng['profit_margin'] if profit_margin is None else profit_margin
        for line in lines:
            num = normalize_phone_number(line)
            if not num:
                skipped += 1
                continue
            try:
                status = 'test' if p['role'] == 'test_user' else 'active'
                assigned_to = p['username'] if p['role'] == 'test_user' else None
                cur = conn.execute(
                    "INSERT OR IGNORE INTO numbers (id,number,country_name,range_name,range_id,rate,profit_margin,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?)",
                    (generate_id(), num, country, range_name, range_id, rate, profit_margin, status, assigned_to)
                )
                success += cur.rowcount
                if cur.rowcount == 0:
                    skipped += 1
            except Exception:
                skipped += 1
        log_audit(conn, p, "numbers_bulk_imported", "numbers", range_id, f"Imported {success} number(s) into {range_name or 'test session'}", request)
    message = f"Imported {success} number(s)"
    if skipped:
        message += f", {skipped} duplicate/invalid skipped"
    return {"message": message, "success": success, "skipped": skipped, "rangeName": range_name, "rangeId": range_id}

@router.post("/bulk-allocate")
async def bulk_allocate(body: BulkAllocateRequest, request: Request, p=Depends(require_role(["admin", "manager"]))):
    if body.quantity < 1:
        raise HTTPException(400, "Quantity must be at least 1")
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        user = conn.execute("SELECT id, username, role, parent_id FROM users WHERE id=?", (body.userId,)).fetchone()
        if not user:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager":
            in_scope = user["role"] in ("reseller", "sub_reseller") and (
                user["parent_id"] == p["id"] or bool(conn.execute(
                    "SELECT 1 FROM users parent WHERE parent.id=? AND parent.parent_id=?",
                    (user["parent_id"], p["id"]),
                ).fetchone())
            )
            if not in_scope:
                raise HTTPException(403, "Managers can allocate only to their reseller/client accounts")
        rng = conn.execute("SELECT rate, profit_margin FROM ranges WHERE name=?", (body.rangeName,)).fetchone()
        default_rate = float(rng["rate"]) if rng and rng["rate"] is not None else 0.05
        default_margin = float(rng["profit_margin"]) if rng and rng["profit_margin"] is not None else 100.0
        margin = float(body.profitMargin) if body.profitMargin is not None else default_margin
        if margin < 0:
            raise HTTPException(400, "Payout margin cannot be negative")

        available = conn.execute(
            "SELECT id, rate FROM numbers WHERE range_name=? AND status != 'test' AND (assigned_to IS NULL OR assigned_to='') LIMIT ?",
            (body.rangeName, body.quantity),
        ).fetchall()
        if len(available) < body.quantity:
            raise HTTPException(400, "Insufficient numbers available in this range")
        for n in available:
            rate = float(n["rate"]) if n["rate"] is not None else default_rate
            conn.execute(
                "UPDATE numbers SET assigned_to=?, assigned_at=?, profit_margin=?, rate=? WHERE id=?",
                (user["username"], now, margin, rate, n["id"]),
            )
            conn.execute(
                "INSERT INTO allocations (id,user_id,username,range_name,number_id,status,created_at) VALUES (?,?,?,?,?,'active',?)",
                (generate_id(), body.userId, user["username"], body.rangeName, n["id"], now),
            )
        log_audit(conn, p, "numbers_bulk_allocated", "user", body.userId, f"Allocated {len(available)} number(s) from {body.rangeName}", request)
    return {"message": "Allocated", "allocated": len(available), "profitMargin": margin}

@router.post("/reseller-allocate")
async def reseller_allocate(body: BulkAllocateRequest, request: Request, p=Depends(get_current_user)):
    if p["role"] != "reseller":
        raise HTTPException(403, "Only reseller accounts can allocate numbers to clients")
    if body.quantity < 1:
        raise HTTPException(400, "Quantity must be at least 1")

    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        target = conn.execute(
            "SELECT id, username, role FROM users WHERE id=? AND parent_id=?",
            (body.userId, p["id"]),
        ).fetchone()
        if not target or target["role"] != "sub_reseller":
            raise HTTPException(400, "Target must be one of your client accounts")

        rng = conn.execute("SELECT profit_margin FROM ranges WHERE name=?", (body.rangeName,)).fetchone()
        default_margin = float(rng["profit_margin"]) if rng and rng["profit_margin"] is not None else 100.0
        margin = float(body.profitMargin) if body.profitMargin is not None else default_margin
        if margin < 0:
            raise HTTPException(400, "Payout margin cannot be negative")

        available = conn.execute(
            """SELECT id FROM numbers
               WHERE range_name=? AND status != 'test' AND assigned_to=? LIMIT ?""",
            (body.rangeName, p["username"], body.quantity),
        ).fetchall()
        if len(available) < body.quantity:
            raise HTTPException(400, "You do not have enough numbers in this range to allocate to your client")

        for n in available:
            conn.execute(
                "UPDATE numbers SET assigned_to=?, assigned_at=?, profit_margin=? WHERE id=?",
                (target["username"], now, margin, n["id"]),
            )
            conn.execute(
                "INSERT INTO allocations (id,user_id,username,range_name,number_id,status,created_at) VALUES (?,?,?,?,?,'active',?)",
                (generate_id(), target["id"], target["username"], body.rangeName, n["id"], now),
            )
        log_audit(conn, p, "numbers_client_allocated", "user", target["id"], f"Allocated {len(available)} number(s) from {body.rangeName}", request)
    return {"message": "Client allocation complete", "allocated": len(available), "profitMargin": margin}

@router.post("/allocate")
async def allocate_numbers(body: AllocateNumbers, request: Request, p=Depends(get_current_user)):
    if p['role'] not in ['reseller', 'sub_reseller']:
        raise HTTPException(403, "Self-allocation is available only to reseller accounts")
    if body.quantity < 1:
        raise HTTPException(400, "Quantity must be at least 1")
    term = (body.duration or "monthly").lower()
    if term not in ("weekly", "monthly"):
        raise HTTPException(400, "duration must be weekly or monthly")

    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (p['id'],)).fetchone()
        if user['self_allocation_limit_enabled']:
            curr = conn.execute("SELECT COUNT(*) FROM numbers WHERE assigned_to=? AND status != 'test'", (p['username'],)).fetchone()[0]
            if curr + body.quantity > user['self_allocation_limit']:
                raise HTTPException(400, "Self allocation limit is over. For more numbers, contact support team.")

        rates = _get_payout_rate_settings(conn)
        flat_rate = rates[term]  # direct dollar amount per SMS
        available = conn.execute(
            "SELECT id FROM numbers WHERE range_name=? AND status != 'test' AND (assigned_to IS NULL OR assigned_to='') LIMIT ?",
            (body.rangeName, body.quantity)
        ).fetchall()
        if len(available) < body.quantity:
            raise HTTPException(400, "Self allocation limit is over. For more numbers, contact support team.")
        for n in available:
            conn.execute(
                "UPDATE numbers SET assigned_to=?, assigned_at=?, rate=?, profit_margin=100 WHERE id=?",
                (p['username'], now, flat_rate, n['id']),
            )
            conn.execute(
                "INSERT INTO allocations (id,user_id,username,range_name,number_id,status,created_at) VALUES (?,?,?,?,?,'active',?)",
                (generate_id(), p['id'], p['username'], body.rangeName, n['id'], now),
            )
        log_audit(conn, p, "numbers_self_allocated", "user", p['id'], f"Allocated {len(available)} number(s) from {body.rangeName} on {term}", request)
    return {"allocated": len(available), "duration": term, "flatRate": flat_rate}

@router.post("/bulk-revoke")
async def bulk_revoke(body: BulkRevokeRequest, request: Request, p=Depends(require_role(["admin", "manager", "reseller"]))):
    with get_db() as conn:
        affected = 0
        detail = body.scope or "ids"

        # Direct ID-based revoke (from checkbox selection in UI)
        if body.numberIds:
            placeholders = ",".join("?" * len(body.numberIds))
            if p["role"] == "reseller":
                # Resellers can only revoke numbers assigned to them or their clients
                cur = conn.execute(
                    f"UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE id IN ({placeholders}) AND assigned_to IN (SELECT username FROM users WHERE id=? OR parent_id=?)",
                    [*body.numberIds, p["id"], p["id"]]
                )
            else:
                cur = conn.execute(
                    f"UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE id IN ({placeholders})",
                    body.numberIds
                )
            affected = cur.rowcount
            conn.execute(
                f"UPDATE allocations SET status='revoked' WHERE number_id IN ({placeholders})",
                body.numberIds
            )
            detail = f"ids={len(body.numberIds)}"
            log_audit(conn, p, "numbers_bulk_revoked", "numbers", None, f"{detail}; affected={affected}", request)
            return {"message": "Revoked", "affected": affected}

        if not body.scope:
            raise HTTPException(400, "scope or numberIds is required")
        if body.scope == "global":
            if p["role"] != "admin":
                raise HTTPException(403, "Only admins can revoke all numbers globally")
            cur = conn.execute("UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE status != 'test' AND assigned_to IS NOT NULL")
            affected = cur.rowcount
            conn.execute("UPDATE allocations SET status='revoked' WHERE status='active'")
        elif body.scope == "range":
            if not body.rangeName:
                raise HTTPException(400, "rangeName is required for range revoke")
            detail = f"range={body.rangeName}"
            if p["role"] == "reseller":
                cur = conn.execute(
                    "UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE status != 'test' AND range_name=? AND assigned_to=?",
                    (body.rangeName, p["username"]),
                )
                conn.execute("UPDATE allocations SET status='revoked' WHERE status='active' AND range_name=? AND username=?", (body.rangeName, p["username"]))
            else:
                cur = conn.execute(
                    "UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE status != 'test' AND range_name=? AND assigned_to IS NOT NULL",
                    (body.rangeName,),
                )
                conn.execute("UPDATE allocations SET status='revoked' WHERE status='active' AND range_name=?", (body.rangeName,))
            affected = cur.rowcount
        elif body.scope == "user":
            if not body.userId:
                raise HTTPException(400, "userId is required for user revoke")
            target = conn.execute("SELECT id, username, role, parent_id FROM users WHERE id=?", (body.userId,)).fetchone()
            if not target:
                raise HTTPException(404, "User not found")
            if p["role"] == "manager":
                in_scope = target["role"] in ("reseller", "sub_reseller") and (
                    target["parent_id"] == p["id"] or bool(conn.execute(
                        "SELECT 1 FROM users parent WHERE parent.id=? AND parent.parent_id=?",
                        (target["parent_id"], p["id"]),
                    ).fetchone())
                )
                if not in_scope:
                    raise HTTPException(403, "Managers can revoke only from their reseller/client accounts")
            if p["role"] == "reseller" and target["parent_id"] != p["id"]:
                raise HTTPException(403, "You can only revoke numbers from your own clients")
            cur = conn.execute(
                "UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE status != 'test' AND assigned_to=?",
                (target["username"],),
            )
            conn.execute("UPDATE allocations SET status='revoked' WHERE status='active' AND user_id=?", (body.userId,))
            affected = cur.rowcount
            detail = f"user={target['username']}"
        else:
            raise HTTPException(400, "scope must be global, range, or user")
        log_audit(conn, p, "numbers_bulk_revoked", "numbers", None, f"{detail}; affected={affected}", request)
    return {"message": "Revoked", "affected": affected}

@router.get("/allocations")
async def list_allocations(
    userId: Optional[str] = Query(None),
    rangeName: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    p=Depends(require_role(["admin", "manager"])),
):
    conds, params = [], []
    if userId:
        conds.append("user_id=?"); params.append(userId)
    if rangeName:
        conds.append("range_name=?"); params.append(rangeName)
    if status:
        conds.append("status=?"); params.append(status)
    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT a.*, n.number
                FROM allocations a
                LEFT JOIN numbers n ON n.id = a.number_id
                WHERE {where}
                ORDER BY a.created_at DESC LIMIT ?""",
            params + [limit],
        ).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/blacklist")
async def list_blacklist(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM blacklisted_apps").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/blacklist")
async def add_to_blacklist(body: dict, p=Depends(require_role(["admin", "manager"]))):
    app_name = body.get("appName", "").strip()
    pattern  = body.get("pattern", "").strip()
    if not app_name:
        raise HTTPException(400, "appName is required")
    with get_db() as conn:
        bid = generate_id()
        conn.execute("INSERT INTO blacklisted_apps (id, app_name, pattern, created_by) VALUES (?,?,?,?)",
                     (bid, app_name, pattern, p["username"]))
    return {"message": "Added to blacklist", "id": bid}

@router.delete("/blacklist/{bid}")
async def remove_from_blacklist(bid: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM blacklisted_apps WHERE id=?", (bid,))
    return {"message": "Removed from blacklist"}

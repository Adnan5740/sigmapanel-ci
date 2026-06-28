"""SMS Ranges - grouping of numbers with pricing and test numbers"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from audit_utils import log_audit
from auth import generate_id
from routes.deps import get_current_user, require_role
from phone_utils import normalize_phone_number

router = APIRouter(prefix="/api/ranges", tags=["ranges"])

class RangeCreate(BaseModel):
    name: str
    realRangeName: Optional[str] = None
    providerName: Optional[str] = None
    numberPrefix: Optional[str] = None
    countryName: Optional[str] = "Global"
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 100.0
    otp_limit_enabled: Optional[int] = 0
    dailyOtpLimit: Optional[int] = None
    otpLimitEnabled: Optional[int] = None
    smsReceiveLimit: Optional[int] = 0
    weeklyRate: Optional[float] = None
    monthlyRate: Optional[float] = None
    defaultPayout: Optional[float] = None

class RangeUpdate(BaseModel):
    name: Optional[str] = None
    realRangeName: Optional[str] = None
    providerName: Optional[str] = None
    numberPrefix: Optional[str] = None
    countryName: Optional[str] = None
    rate: Optional[float] = None
    profitMargin: Optional[float] = None
    dailyOtpLimit: Optional[int] = None
    otpLimitEnabled: Optional[int] = None
    smsReceiveLimit: Optional[int] = None
    status: Optional[str] = None
    weeklyRate: Optional[float] = None
    monthlyRate: Optional[float] = None
    defaultPayout: Optional[float] = None

class RangeNumbersAdd(BaseModel):
    numbers: List[str]
    countryName: Optional[str] = None
    rate: Optional[float] = None

class RangeTestNumbersAdd(BaseModel):
    numbers: List[str]
    countryName: Optional[str] = None
    service: Optional[str] = None

def _clean_numbers(numbers: List[str]) -> List[str]:
    cleaned = []
    seen = set()
    for raw in numbers or []:
        normalized = normalize_phone_number(str(raw or "").strip())
        if normalized and normalized not in seen:
            cleaned.append(normalized)
            seen.add(normalized)
    if not cleaned:
        raise HTTPException(400, "Please provide at least one valid phone number")
    return cleaned

@router.get("")
async def list_ranges(status: str = Query(None), search: str = Query(None), p=Depends(get_current_user)):
    conds, params = [], []
    if status: conds.append("status = ?"); params.append(status)
    if search:
        conds.append("(name LIKE ? OR country_name LIKE ? OR real_range_name LIKE ? OR provider_name LIKE ?)")
        params.extend([f"%{search}%"] * 4)
    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT r.*, (SELECT COUNT(*) FROM numbers WHERE range_id = r.id AND status != 'test') as numbers_count, (SELECT COUNT(*) FROM numbers WHERE range_id = r.id AND status != 'test' AND (assigned_to IS NULL OR assigned_to='')) as available_count FROM ranges r WHERE {where} ORDER BY created_at DESC"
        rows = conn.execute(q, params).fetchall()
    data = []
    for r in rows:
        d = dict(r)
        rate = float(d.get("rate") or 0)
        margin = float(d.get("profit_margin") if d.get("profit_margin") is not None else 100)
        d["payout_rate"] = round(rate, 6)
        d["_count"] = {"numbers": d.pop("numbers_count"), "available": d.pop("available_count")}
        if p.get("role") not in ("admin", "manager"):
            d.pop("real_range_name", None)
            d.pop("provider_name", None)
        data.append(d)
    return {"data": data}

@router.post("")
async def create_range(body: RangeCreate, request: Request, p=Depends(require_role(["admin", "manager"]))):
    daily_limit = body.dailyOtpLimit if body.dailyOtpLimit is not None else body.daily_otp_limit
    limit_enabled = body.otpLimitEnabled if body.otpLimitEnabled is not None else body.otp_limit_enabled
    sms_recv_limit = body.smsReceiveLimit or 0
    payout_rate = max(0, float(body.rate or 0))
    profit_margin = max(0, float(body.profitMargin if body.profitMargin is not None else 100.0))
    weekly_rate = body.weeklyRate
    monthly_rate = body.monthlyRate
    default_payout = body.defaultPayout
    with get_db() as conn:
        rid = generate_id()
        conn.execute("INSERT INTO ranges (id, name, real_range_name, provider_name, number_prefix, country_name, rate, profit_margin, daily_otp_limit, otp_limit_enabled, sms_receive_limit, weekly_rate, monthly_rate, default_payout) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                     (rid, body.name.strip(), (body.realRangeName or '').strip() or None, (body.providerName or '').strip() or None, body.numberPrefix, body.countryName, payout_rate, profit_margin, daily_limit, limit_enabled, sms_recv_limit, weekly_rate, monthly_rate, default_payout))
        log_audit(conn, p, "range_created", "range", rid, body.name, request)
    return {"message": "Range created", "id": rid, "range_id": rid}

@router.put("/{rid}")
async def update_range(rid: str, body: RangeUpdate, request: Request, p=Depends(require_role(["admin", "manager"]))):
    updates = {}
    if body.name is not None: updates["name"] = body.name.strip()
    if body.realRangeName is not None: updates["real_range_name"] = body.realRangeName.strip() or None
    if body.providerName is not None: updates["provider_name"] = body.providerName.strip() or None
    if body.numberPrefix is not None: updates["number_prefix"] = body.numberPrefix
    if body.countryName is not None: updates["country_name"] = body.countryName
    if body.rate is not None: updates["rate"] = max(0, body.rate)
    if body.profitMargin is not None: updates["profit_margin"] = max(0, body.profitMargin)
    if body.dailyOtpLimit is not None: updates["daily_otp_limit"] = max(0, body.dailyOtpLimit)
    if body.otpLimitEnabled is not None: updates["otp_limit_enabled"] = 1 if body.otpLimitEnabled else 0
    if body.smsReceiveLimit is not None: updates["sms_receive_limit"] = max(0, body.smsReceiveLimit)
    if body.weeklyRate is not None: updates["weekly_rate"] = body.weeklyRate
    if body.monthlyRate is not None: updates["monthly_rate"] = body.monthlyRate
    if body.defaultPayout is not None: updates["default_payout"] = body.defaultPayout
    if body.status is not None:
        if body.status not in ("active", "inactive", "revoked"):
            raise HTTPException(400, "Invalid range status")
        updates["status"] = body.status
    if not updates:
        raise HTTPException(400, "No updates provided")
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not existing:
            raise HTTPException(404, "Range not found")
        conn.execute(f"UPDATE ranges SET {','.join(f'{k}=?' for k in updates)} WHERE id=?", list(updates.values()) + [rid])
        if "name" in updates and updates["name"] != existing["name"]:
            conn.execute("UPDATE numbers SET range_name=? WHERE range_id=?", (updates["name"], rid))
            conn.execute("UPDATE allocations SET range_name=? WHERE range_name=?", (updates["name"], existing["name"]))
        if "rate" in updates or "profit_margin" in updates:
            payout_rate = updates.get("rate", existing["rate"])
            payout_margin = updates.get("profit_margin", existing["profit_margin"])
            conn.execute("UPDATE numbers SET rate=?, profit_margin=? WHERE range_id=?", (payout_rate, payout_margin, rid))
        row = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        log_audit(conn, p, "range_updated", "range", rid, ", ".join(updates.keys()), request)
    return {"data": dict(row)}

@router.delete("/{rid}")
async def delete_range(rid: str, request: Request, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        rng = conn.execute("SELECT name FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng: raise HTTPException(404, "Range not found")
        conn.execute("UPDATE numbers SET range_id=NULL, range_name=NULL WHERE range_id=?", (rid,))
        conn.execute("DELETE FROM ranges WHERE id=?", (rid,))
        log_audit(conn, p, "range_deleted", "range", rid, rng["name"], request)
    return {"message": "Deleted"}

@router.post("/{rid}/numbers")
async def add_numbers_to_range(rid: str, body: RangeNumbersAdd, request: Request, p=Depends(require_role(["admin", "manager"]))):
    numbers = _clean_numbers(body.numbers)
    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng:
            raise HTTPException(404, "Range not found")
        rng = dict(rng)
        country = body.countryName or rng.get("country_name")
        rate = body.rate if body.rate is not None else rng.get("rate")
        profit_margin = rng.get("profit_margin")
        range_name = rng.get("name")
        added = 0
        for num in numbers:
            nid = generate_id()
            cur = conn.execute(
                "INSERT OR IGNORE INTO numbers (id, number, country_name, range_id, range_name, status, rate, profit_margin) VALUES (?,?,?,?,?,?,?,?)",
                (nid, num, country, rid, range_name, "active", rate, profit_margin)
            )
            added += cur.rowcount
        log_audit(conn, p, "range_numbers_added", "range", rid, f"{added} live number(s) added to {range_name}", request)
    skipped = len(numbers) - added
    message = f"{added} number(s) added"
    if skipped:
        message += f", {skipped} duplicate(s) skipped"
    return {"message": message, "added": added, "skipped": skipped}

@router.post("/{rid}/test-numbers")
async def add_test_numbers_to_range(rid: str, body: RangeTestNumbersAdd, request: Request, p=Depends(require_role(["admin", "manager"]))):
    numbers = _clean_numbers(body.numbers)
    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng:
            raise HTTPException(404, "Range not found")
        rng = dict(rng)
        country = body.countryName or rng.get("country_name")
        added = 0
        for num in numbers:
            nid = generate_id()
            cur = conn.execute(
                "INSERT OR IGNORE INTO numbers (id, number, country_name, range_id, range_name, service, status, rate, profit_margin) VALUES (?,?,?,?,?,?,?,?,?)",
                (nid, num, country, rid, rng.get("name"), body.service, "test", rng.get("rate"), rng.get("profit_margin"))
            )
            added += cur.rowcount
        log_audit(conn, p, "range_test_numbers_added", "range", rid, f"{added} test number(s) added to {rng.get('name')}", request)
    skipped = len(numbers) - added
    message = f"{added} test number(s) added"
    if skipped:
        message += f", {skipped} duplicate(s) skipped"
    return {"message": message, "added": added, "skipped": skipped}

@router.get("/{rid}/numbers")
async def list_range_numbers(rid: str, p=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM numbers WHERE range_id = ? AND status != 'test' ORDER BY created_at DESC", (rid,)).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.delete("/{rid}/numbers/{nid}")
async def delete_range_number(rid: str, nid: str, request: Request, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        num = conn.execute("SELECT number FROM numbers WHERE id=? AND range_id=?", (nid, rid)).fetchone()
        if not num: raise HTTPException(404, "Number not found in range")
        conn.execute("DELETE FROM numbers WHERE id=? AND range_id=?", (nid, rid))
        log_audit(conn, p, "range_number_removed", "range", rid, num["number"], request)
    return {"message": "Deleted"}

"""SMS Ranges - grouping of numbers with pricing and test numbers"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import generate_id
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/ranges", tags=["ranges"])

class RangeCreate(BaseModel):
    name: str
    numberPrefix: Optional[str] = None
    countryName: Optional[str] = "Global"
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 50.0
    daily_otp_limit: Optional[int] = 0
    otp_limit_enabled: Optional[int] = 0
    dailyOtpLimit: Optional[int] = None
    otpLimitEnabled: Optional[int] = None

class RangeNumbersAdd(BaseModel):
    numbers: List[str]
    countryName: Optional[str] = None
    rate: Optional[float] = None

class RangeTestNumbersAdd(BaseModel):
    numbers: List[str]
    countryName: Optional[str] = None
    service: Optional[str] = None

@router.get("")
async def list_ranges(status: str = Query(None), search: str = Query(None), p=Depends(get_current_user)):
    conds, params = [], []
    if status: conds.append("status = ?"); params.append(status)
    if search: conds.append("(name LIKE ? OR country_name LIKE ?)"); params.extend([f"%{search}%"] * 2)
    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT r.*, (SELECT COUNT(*) FROM numbers WHERE range_id = r.id) as numbers_count, (SELECT COUNT(*) FROM numbers WHERE range_id = r.id AND (assigned_to IS NULL OR assigned_to='')) as available_count FROM ranges r WHERE {where} ORDER BY created_at DESC"
        rows = conn.execute(q, params).fetchall()
    data = []
    for r in rows:
        d = dict(r)
        d["_count"] = {"numbers": d.pop("numbers_count"), "available": d.pop("available_count")}
        data.append(d)
    return {"data": data}

@router.post("")
async def create_range(body: RangeCreate, p=Depends(require_role(["admin", "manager"]))):
    daily_limit = body.dailyOtpLimit if body.dailyOtpLimit is not None else body.daily_otp_limit
    limit_enabled = body.otpLimitEnabled if body.otpLimitEnabled is not None else body.otp_limit_enabled
    with get_db() as conn:
        rid = generate_id()
        conn.execute("INSERT INTO ranges (id, name, number_prefix, country_name, rate, profit_margin, daily_otp_limit, otp_limit_enabled) VALUES (?,?,?,?,?,?,?,?)",
                     (rid, body.name, body.numberPrefix, body.countryName, body.rate, body.profitMargin, daily_limit, limit_enabled))
    return {"message": "Range created", "id": rid, "range_id": rid}

@router.delete("/{rid}")
async def delete_range(rid: str, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM ranges WHERE id=?", (rid,))
    return {"message": "Deleted"}

@router.post("/{rid}/numbers")
async def add_numbers_to_range(rid: str, body: RangeNumbersAdd, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng:
            raise HTTPException(404, "Range not found")
        rng = dict(rng)
        country = body.countryName or rng.get("country_name")
        rate = body.rate if body.rate is not None else rng.get("rate")
        profit_margin = rng.get("profit_margin")
        range_name = rng.get("name")
        for num in body.numbers:
            nid = generate_id()
            conn.execute(
                "INSERT INTO numbers (id, number, country_name, range_id, range_name, status, rate, profit_margin) VALUES (?,?,?,?,?,?,?,?)",
                (nid, num, country, rid, range_name, "active", rate, profit_margin)
            )
    return {"message": f"{len(body.numbers)} number(s) added", "added": len(body.numbers)}

@router.post("/{rid}/test-numbers")
async def add_test_numbers_to_range(rid: str, body: RangeTestNumbersAdd, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng:
            raise HTTPException(404, "Range not found")
        rng = dict(rng)
        country = body.countryName or rng.get("country_name")
        for num in body.numbers:
            nid = generate_id()
            conn.execute(
                "INSERT OR IGNORE INTO numbers (id, number, country_name, range_id, range_name, service, status, rate, profit_margin) VALUES (?,?,?,?,?,?,?,?,?)",
                (nid, num, country, rid, rng.get("name"), body.service, "test", rng.get("rate"), rng.get("profit_margin"))
            )
    return {"message": f"{len(body.numbers)} test number(s) added", "added": len(body.numbers)}

@router.get("/{rid}/numbers")
async def list_range_numbers(rid: str, p=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM numbers WHERE range_id = ? ORDER BY created_at DESC", (rid,)).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.delete("/{rid}/numbers/{nid}")
async def delete_range_number(rid: str, nid: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM numbers WHERE id=? AND range_id=?", (nid, rid))
    return {"message": "Deleted"}

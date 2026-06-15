"""SMS Ranges - grouping of numbers with pricing and test numbers"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
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

class RangeUpdate(BaseModel):
    name: Optional[str] = None
    numberPrefix: Optional[str] = None
    countryName: Optional[str] = None
    rate: Optional[float] = None
    profitMargin: Optional[float] = None
    daily_otp_limit: Optional[int] = None
    otp_limit_enabled: Optional[int] = None

class RangeImport(BaseModel):
    numbersText: str

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
    with get_db() as conn:
        rid = generate_id()
        conn.execute("INSERT INTO ranges (id, name, number_prefix, country_name, rate, profit_margin, daily_otp_limit, otp_limit_enabled) VALUES (?,?,?,?,?,?,?,?)",
                     (rid, body.name, body.numberPrefix, body.countryName, body.rate, body.profitMargin, body.daily_otp_limit, body.otp_limit_enabled))
    return {"message": "Range created"}

@router.put("/{rid}")
async def update_range(rid: str, body: RangeUpdate, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not existing: raise HTTPException(404, "Range not found")

        upd = {
            "name": body.name if body.name is not None else existing["name"],
            "number_prefix": body.numberPrefix if body.numberPrefix is not None else existing["number_prefix"],
            "country_name": body.countryName if body.countryName is not None else existing["country_name"],
            "rate": body.rate if body.rate is not None else existing["rate"],
            "profit_margin": body.profitMargin if body.profitMargin is not None else existing["profit_margin"],
            "daily_otp_limit": body.daily_otp_limit if body.daily_otp_limit is not None else existing["daily_otp_limit"],
            "otp_limit_enabled": body.otp_limit_enabled if body.otp_limit_enabled is not None else existing["otp_limit_enabled"],
        }

        conn.execute(
            """UPDATE ranges SET name=?, number_prefix=?, country_name=?, rate=?, profit_margin=?, daily_otp_limit=?, otp_limit_enabled=? WHERE id=?""",
            (upd["name"], upd["number_prefix"], upd["country_name"], upd["rate"], upd["profit_margin"], upd["daily_otp_limit"], upd["otp_limit_enabled"], rid)
        )
    return {"message": "Range updated"}

@router.post("/{rid}/import")
async def import_range_numbers(rid: str, body: RangeImport, p=Depends(require_role(["admin", "manager"]))):
    import re
    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE id=?", (rid,)).fetchone()
        if not rng: raise HTTPException(404, "Range not found")

        lines = [l.strip() for l in body.numbersText.splitlines() if l.strip()]
        success = 0
        for line in lines:
            num = re.sub(r'[\s\-\(\)]', '', line)
            if not num.startswith('+'): num = '+' + num
            try:
                conn.execute(
                    "INSERT OR IGNORE INTO numbers (id,number,country_name,range_name,range_id,rate,profit_margin,status) VALUES (?,?,?,?,?,?,?,?)",
                    (generate_id(), num, rng["country_name"], rng["name"], rid, rng["rate"], rng["profit_margin"], 'active')
                )
                success += 1
            except: pass
    return {"success": success}

@router.delete("/{rid}")
async def delete_range(rid: str, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM ranges WHERE id=?", (rid,))
    return {"message": "Deleted"}

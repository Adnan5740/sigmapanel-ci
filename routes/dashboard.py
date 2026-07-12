"""Dashboard - stats scoped by role"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from database import get_db
from auth import verify_token, extract_token
from datetime import datetime, timedelta
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

PRODUCTION_SMS = "number NOT IN (SELECT number FROM numbers WHERE status = 'test')"
TEST_SMS = "number IN (SELECT number FROM numbers WHERE status = 'test')"

@router.get("/stats")
async def get_stats(request: Request, p=Depends(get_current_user)):
    now = datetime.utcnow()
    day_start   = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start  = (now - timedelta(days=now.weekday())).replace(hour=0,minute=0,second=0,microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    role = p["role"]
    username = p["username"]
    user_id  = p["id"]

    with get_db() as conn:
        # SMS scope filter
        if role == "test_user":
            sms_cond = f"{TEST_SMS} AND assigned_to = ?"
            sms_param = username
        elif role in ["sub_reseller"]:
            sms_cond = f"{PRODUCTION_SMS} AND assigned_to = ?"
            sms_param = username
        elif role == "reseller":
            my_users = [r["username"] for r in conn.execute(
                "SELECT username FROM users WHERE parent_id=?", (user_id,)
            ).fetchall()]
            names = [username] + my_users
            ph = ",".join("?"*len(names))
            sms_cond = f"{PRODUCTION_SMS} AND assigned_to IN ({ph})"
            sms_param = names
        else:
            sms_cond = PRODUCTION_SMS
            sms_param = None

        def sms_count(extra_where=""):
            q = f"SELECT COUNT(*) FROM sms_received WHERE {sms_cond}"
            if extra_where: q += f" AND {extra_where}"
            if isinstance(sms_param, list): return conn.execute(q, sms_param).fetchone()[0]
            elif sms_param: return conn.execute(q, (sms_param,)).fetchone()[0]
            else: return conn.execute(q).fetchone()[0]

        today_sms = sms_count(f"received_at >= '{day_start}'")
        week_sms  = sms_count(f"received_at >= '{week_start}'")
        month_sms = sms_count(f"received_at >= '{month_start}'")

        # Numbers scope
        if role == "test_user":
            num_cond, num_p = "assigned_to=? AND status='test'", (username,)
        elif role in ["sub_reseller"]:
            num_cond, num_p = "assigned_to=? AND status != 'test'", (username,)
        elif role == "reseller":
            num_cond = f"assigned_to IN ({ph}) AND status != 'test'"
            num_p = tuple(names)
        else:
            num_cond, num_p = "status != 'test'", ()

        total_numbers  = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {num_cond}", num_p).fetchone()[0]
        active_numbers = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {num_cond} AND status='active'", num_p).fetchone()[0]

        # Users count
        if role == "admin":
            total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        elif role == "manager":
            total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role='reseller'").fetchone()[0]
        elif role == "reseller":
            total_users = conn.execute("SELECT COUNT(*) FROM users WHERE parent_id=?", (user_id,)).fetchone()[0]
        else:
            total_users = 0

        # Providers - Only show to admin and manager
        if role == "admin":
            active_providers = conn.execute("SELECT COUNT(*) FROM providers WHERE status='active'").fetchone()[0]
        elif role == "manager":
            active_providers = conn.execute("SELECT COUNT(*) FROM providers WHERE status='active'").fetchone()[0]
        else:
            active_providers = None  # Hide from reseller and sub_reseller


        # Allocations
        if role == "admin":
            total_allocations = conn.execute("SELECT COUNT(*) FROM allocations WHERE status='active'").fetchone()[0]
        else:
            total_allocations = conn.execute("SELECT COUNT(*) FROM allocations WHERE user_id=? AND status='active'", (user_id,)).fetchone()[0]

        # DLRs - Only show to admin and manager
        if role == "admin":
            total_dlrs = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE otp IS NOT NULL AND {PRODUCTION_SMS}").fetchone()[0]
        elif role == "manager":
            total_dlrs = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE otp IS NOT NULL AND {PRODUCTION_SMS}").fetchone()[0]
        else:
            # For reseller/sub_reseller, calculate their own DLRs only
            dlr_cond = f"otp IS NOT NULL AND {sms_cond}"
            args = sms_param if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
            total_dlrs = conn.execute(dlr_cond, args).fetchone()[0] if args else conn.execute(dlr_cond).fetchone()[0]

        # Profit uses sms_received.profit so dashboard, payout pages, and analytics
        # report the same scoped earnings even if a legacy row has no ledger entry.
        def profit_sum(extra_where=""):
            q = f"SELECT COALESCE(SUM(profit),0) FROM sms_received WHERE {sms_cond}"
            if extra_where:
                q += f" AND {extra_where}"
            args = list(sms_param) if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
            return round(float(conn.execute(q, args).fetchone()[0] or 0), 6)

        today_profit = profit_sum(f"received_at >= '{day_start}'")
        month_profit = profit_sum(f"received_at >= '{month_start}'")

        # Chart: sms by day for last 7 days
        week_by_day = []
        for i in range(7):
            ds = (now - timedelta(days=6-i)).replace(hour=0,minute=0,second=0,microsecond=0)
            de = ds + timedelta(days=1)
            q = f"SELECT COUNT(*) FROM sms_received WHERE {sms_cond} AND received_at>=? AND received_at<?"
            args_base = list(sms_param) if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
            cnt = conn.execute(q, args_base + [ds.isoformat(), de.isoformat()]).fetchone()[0]
            week_by_day.append({"date": ds.strftime("%Y-%m-%d"), "count": cnt})

        # Top services today
        q = f"SELECT service, COUNT(*) cnt FROM sms_received WHERE {sms_cond} AND service IS NOT NULL AND received_at>=? GROUP BY service ORDER BY cnt DESC LIMIT 8"
        args_base = list(sms_param) if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
        svc_rows = conn.execute(q, args_base + [day_start]).fetchall()
        services = [{"service": r["service"], "count": r["cnt"]} for r in svc_rows]

    return {
        "todaySms": today_sms,
        "weekSms": week_sms,
        "monthSms": month_sms,
        "todayProfit": today_profit,
        "monthProfit": month_profit,
        "totalNumbers": total_numbers,
        "activeNumbers": active_numbers,
        "totalUsers": total_users,
        "activeProviders": active_providers,
        "totalAllocations": total_allocations,
        "totalDlrs": total_dlrs,
        "todaySmsByService": services,
        "weekSmsByDay": week_by_day,
        "role": role,
    }

@router.get("/recent-sms")
async def recent_sms(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    p=Depends(get_current_user),
):
    role, username, user_id = p["role"], p["username"], p["id"]

    with get_db() as conn:
        if role == "test_user":
            cond = f"{TEST_SMS} AND assigned_to=?"
            params = [username]
        elif role in ["sub_reseller"]:
            cond = f"{PRODUCTION_SMS} AND assigned_to=?"
            params = [username]
        elif role == "reseller":
            my = [r["username"] for r in conn.execute("SELECT username FROM users WHERE parent_id=?", (user_id,)).fetchall()]
            names = [username] + my
            cond = f"{PRODUCTION_SMS} AND assigned_to IN ({','.join('?'*len(names))})"
            params = names
        else:
            cond = PRODUCTION_SMS
            params = []

        rows = conn.execute(
            f"SELECT * FROM sms_received WHERE {cond} ORDER BY received_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE {cond}", params).fetchone()[0]

    return {
        "data": [dict(r) for r in rows],
        "pagination": {"total": total, "limit": limit, "offset": offset, "hasMore": offset+limit<total},
    }

@router.get("/analytics")
async def get_analytics(request: Request, p=Depends(get_current_user)):
    role = p["role"]
    username = p["username"]
    with get_db() as conn:
        if role == "test_user":
            cond = f"{TEST_SMS} AND assigned_to = ?"
            params = [username]
        elif role == "sub_reseller":
            cond = f"{PRODUCTION_SMS} AND assigned_to = ?"
            params = [username]
        elif role == "reseller":
            sub_users = [r["username"] for r in conn.execute("SELECT username FROM users WHERE parent_id=?", (p["id"],)).fetchall()]
            names = [username] + sub_users
            ph = ",".join("?" * len(names))
            cond = f"{PRODUCTION_SMS} AND assigned_to IN ({ph})"
            params = names
        else:
            cond = PRODUCTION_SMS
            params = []

        sms_trend = conn.execute(
            f"SELECT date(received_at) as d, COUNT(*) as c FROM sms_received WHERE {cond} GROUP BY date(received_at) ORDER BY d DESC LIMIT 30",
            params,
        ).fetchall()
        profit_trend = conn.execute(
            f"SELECT date(received_at) as d, COALESCE(SUM(profit),0) as p FROM sms_received WHERE {cond} GROUP BY date(received_at) ORDER BY d DESC LIMIT 30",
            params,
        ).fetchall()
        by_service = conn.execute(
            f"SELECT COALESCE(service,'Unknown') as service, COUNT(*) as count FROM sms_received WHERE {cond} GROUP BY COALESCE(service,'Unknown') ORDER BY count DESC LIMIT 10",
            params,
        ).fetchall()
        by_status = conn.execute(
            f"""SELECT
                    SUM(CASE WHEN otp IS NOT NULL AND otp != '' THEN 1 ELSE 0 END) AS delivered,
                    SUM(CASE WHEN otp IS NULL OR otp = '' THEN 1 ELSE 0 END) AS received_only,
                    COUNT(*) AS total
                FROM sms_received WHERE {cond}""",
            params,
        ).fetchone()
        failed = conn.execute(
            """SELECT COUNT(*) FROM security_events
               WHERE event_type IN ('SMS_FAILED', 'WEBHOOK_ERROR', 'SMS_REJECTED')
                  OR action_taken LIKE '%SMS%'"""
        ).fetchone()[0] if role in ("admin", "manager") else 0

    total_sms = int(by_status["total"] or 0) if by_status else 0
    delivered = int(by_status["delivered"] or 0) if by_status else 0
    received_only = int(by_status["received_only"] or 0) if by_status else 0
    return {
        "sms_over_time": [{"date": r["d"], "count": r["c"]} for r in sms_trend][::-1],
        "profit_over_time": [{"date": r["d"], "profit": r["p"]} for r in profit_trend][::-1],
        "by_service": [{"service": r["service"], "count": r["count"]} for r in by_service],
        "status_counts": {"total": total_sms, "delivered": delivered, "receivedOnly": received_only, "failed": failed},
        "success_rates": {"global": round(delivered / total_sms, 4) if total_sms > 0 else 0},
    }

@router.get("/live-activity")
async def get_live_activity(request: Request, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        active_users = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'active'").fetchone()[0]
        active_numbers = conn.execute("SELECT COUNT(*) FROM numbers WHERE status = 'active' AND assigned_to IS NOT NULL AND assigned_to != ''").fetchone()[0]
        recent_events = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10").fetchall()
    return {
        "active_users": active_users,
        "active_numbers": active_numbers,
        "recent_events": [dict(r) for r in recent_events]
    }

@router.get("/activity-logs")
async def dashboard_activity_logs(request: Request, limit: int = Query(50, ge=1, le=100), p=Depends(get_current_user)):
    with get_db() as conn:
        if p['role'] in ['admin', 'manager']:
            rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM audit_logs WHERE actor_username = ? ORDER BY created_at DESC LIMIT ?", (p['username'], limit)).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/audit-logs")
async def dashboard_audit_logs(request: Request, limit: int = Query(50, ge=1, le=100), p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return {"data": [dict(r) for r in rows]}


def _calc_level(otp_today: int) -> dict:
    """Calculate user level and allocation limit based on daily OTPs received."""
    levels = [
        {"name": "Bronze",   "min": 0,    "max": 99,   "limit": 10,  "color": "#cd7f32", "icon": "🥉"},
        {"name": "Silver",   "min": 100,  "max": 299,  "limit": 30,  "color": "#c0c0c0", "icon": "🥈"},
        {"name": "Gold",     "min": 300,  "max": 699,  "limit": 75,  "color": "#ffd700", "icon": "🥇"},
        {"name": "Platinum", "min": 700,  "max": 999,  "limit": 150, "color": "#e5e4e2", "icon": "💎"},
        {"name": "Diamond",  "min": 1000, "max": 1999, "limit": 300, "color": "#b9f2ff", "icon": "💠"},
        {"name": "Elite",    "min": 2000, "max": 9999, "limit": 500, "color": "#7c3aed", "icon": "⭐"},
        {"name": "Legend",   "min": 10000,"max": 999999,"limit": 1000,"color": "#dc2626","icon": "👑"},
    ]
    current = levels[0]
    next_lvl = levels[1] if len(levels) > 1 else None
    for i, lvl in enumerate(levels):
        if otp_today >= lvl["min"]:
            current = lvl
            next_lvl = levels[i+1] if i+1 < len(levels) else None
    progress = 0
    if next_lvl:
        span = next_lvl["min"] - current["min"]
        progress = int(min(100, (otp_today - current["min"]) / span * 100)) if span > 0 else 100
    else:
        progress = 100
    return {
        "level": current["name"],
        "icon": current["icon"],
        "color": current["color"],
        "allocationLimit": current["limit"],
        "otpToday": otp_today,
        "nextLevel": next_lvl["name"] if next_lvl else None,
        "nextLevelMin": next_lvl["min"] if next_lvl else None,
        "progress": progress,
    }


@router.get("/user-performance")
async def user_performance(request: Request, userId: str = None, p=Depends(get_current_user)):
    """Return performance stats and level for a user (or current user)."""
    from auth import extract_token, verify_token
    uid = userId if userId and p["role"] in ("admin", "manager") else p["id"]
    username = p["username"]
    if userId and userId != p["id"] and p["role"] in ("admin", "manager"):
        from database import get_db as _gdb
        with _gdb() as conn:
            u = conn.execute("SELECT username FROM users WHERE id=?", (uid,)).fetchone()
            if u: username = u["username"]

    today = datetime.utcnow().strftime("%Y-%m-%d")
    thirty_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

    with get_db() as conn:
        otp_today   = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE username=? AND otp IS NOT NULL AND date(received_at)=?",
            (username, today)).fetchone()[0]
        otp_30days  = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE username=? AND otp IS NOT NULL AND received_at>=?",
            (username, thirty_ago)).fetchone()[0]
        sms_30days  = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE username=? AND received_at>=?",
            (username, thirty_ago)).fetchone()[0]
        total_payout = conn.execute(
            "SELECT COALESCE(SUM(profit),0) FROM sms_received WHERE username=?",
            (username,)).fetchone()[0]
        numbers_held = conn.execute(
            "SELECT COUNT(*) FROM numbers WHERE assigned_to=? AND status='active'",
            (username,)).fetchone()[0]
        alloc_limit_enabled = conn.execute(
            "SELECT self_allocation_limit_enabled FROM users WHERE id=?", (uid,)).fetchone()
        limit_enabled = alloc_limit_enabled["self_allocation_limit_enabled"] if alloc_limit_enabled else 0

    level_info = _calc_level(otp_today)

    return {
        "userId": uid,
        "username": username,
        "otpToday": otp_today,
        "otp30Days": otp_30days,
        "sms30Days": sms_30days,
        "totalPayout": round(float(total_payout), 4),
        "numbersHeld": numbers_held,
        "limitEnabled": bool(limit_enabled),
        **level_info,
    }

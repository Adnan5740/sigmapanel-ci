"""Users CRUD with strict role-based permissions and data isolation"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Optional
import re
from database import get_db
from audit_utils import log_audit
from auth import verify_token, extract_token, generate_id, hash_password
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/users", tags=["users"])

# -- Role hierarchy --
CAN_CREATE = {
    "admin": {"admin", "manager", "reseller", "sub_reseller", "test_user"},
    "manager": {"reseller", "sub_reseller"},
    "reseller": {"sub_reseller"},
    "sub_reseller": set(),
}
CAN_MANAGE_USERS = {"admin", "manager", "reseller"}

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: Optional[str] = "sub_reseller"
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    parentId: Optional[str] = None
    balance: Optional[float] = 0
    creditLimit: Optional[float] = 0
    self_allocation_limit: Optional[int] = 100
    self_allocation_limit_enabled: Optional[int] = 0

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', v):
            raise ValueError("Username must be 3-50 chars")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6: raise ValueError("Min 6 chars")
        return v

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    balance: Optional[float] = None
    password: Optional[str] = None
    self_allocation_limit: Optional[int] = None
    self_allocation_limit_enabled: Optional[int] = None

class UserStatusAction(BaseModel):
    status: str
    note: Optional[str] = None

@router.get("")
async def list_users(search: str = Query(None), role: str = Query(None), p=Depends(get_current_user)):
    if p["role"] not in CAN_MANAGE_USERS: raise HTTPException(403)
    conds, params = [], []

    if p["role"] == "manager":
        conds.append("(id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM users WHERE parent_id = ?))")
        params.extend([p["id"], p["id"], p["id"]])
    elif p["role"] == "reseller":
        conds.append("(id = ? OR parent_id = ?)")
        params.extend([p["id"], p["id"]])

    if search:
        conds.append("(username LIKE ? OR email LIKE ?)")
        params.extend([f"%{search}%"] * 2)
    if role:
        conds.append("role = ?"); params.append(role)

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT u.*, (SELECT COUNT(*) FROM users WHERE parent_id = u.id) as children_count FROM users u WHERE {where} ORDER BY created_at DESC"
        rows = conn.execute(q, params).fetchall()

    data = []
    for r in rows:
        d = dict(r)
        if 'password' in d: del d['password']
        d["_count"] = {"children": d.pop("children_count")}
        data.append(d)
    return {"data": data}

@router.post("")
async def create_user(body: UserCreate, request: Request, p=Depends(get_current_user)):
    if p["role"] not in CAN_MANAGE_USERS: raise HTTPException(403)
    allowed = CAN_CREATE.get(p["role"], set())
    if body.role not in allowed: raise HTTPException(403, "Cannot create this role")

    # Only admins can set initial balance. Resellers and managers get 0 balance by default.
    if body.balance and body.balance != 0:
        if p["role"] != "admin":
            raise HTTPException(403, "Only admins can set initial user balance")
    
    with get_db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE username=?", (body.username,)).fetchone(): raise HTTPException(409, "Exists")
        uid = generate_id()
        parent = p["id"]
        initial_balance = body.balance if p["role"] == "admin" else 0
        
        if p["role"] == "admin" and body.parentId:
            if not conn.execute("SELECT 1 FROM users WHERE id=?", (body.parentId,)).fetchone():
                raise HTTPException(400, "Parent user not found")
            parent = body.parentId
        elif p["role"] == "manager" and body.parentId:
            target_parent = conn.execute("SELECT id, role, parent_id FROM users WHERE id=?", (body.parentId,)).fetchone()
            if not target_parent:
                raise HTTPException(400, "Parent user not found")
            if target_parent["id"] != p["id"] and target_parent["parent_id"] != p["id"]:
                raise HTTPException(403, "Parent account is outside your management scope")
            parent = body.parentId
        elif p["role"] == "reseller" and body.parentId and body.parentId != p["id"]:
            raise HTTPException(403, "Resellers can create only under their own account")
        conn.execute(
            """INSERT INTO users (id,username,email,password,role,status,full_name,phone,country,parent_id,balance,self_allocation_limit,self_allocation_limit_enabled)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, body.username, body.email, hash_password(body.password), body.role, "active", body.fullName, body.phone, body.country, parent, initial_balance, body.self_allocation_limit, body.self_allocation_limit_enabled)
        )
        detail = f"Created {body.username} as {body.role}"
        if initial_balance != 0:
            detail += f" with balance ${initial_balance:.2f}"
        log_audit(conn, p, "user_created", "user", uid, detail, request)
    return {"message": "User created", "id": uid}

@router.get("/registration-requests")
async def list_reg_requests(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM registration_requests WHERE status='pending' ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/registration-requests/{req_id}/approve")
async def approve_reg_request(req_id: str, request: Request, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM registration_requests WHERE id=?", (req_id,)).fetchone()
        if not req: raise HTTPException(404)
        if req["status"] != "pending": raise HTTPException(400, "Registration request already processed")
        if conn.execute("SELECT 1 FROM users WHERE username=?", (req["username"],)).fetchone():
            raise HTTPException(409, "Username already exists")
        uid = generate_id()
        role = "reseller" if p["role"] == "admin" else "reseller"
        conn.execute(
            """INSERT INTO users (id,username,email,password,role,status,parent_id,full_name,phone,country)
               VALUES (?,?,?,?,?,'active',?,?,?,?)""",
            (uid, req["username"], req["email"], req["password"], role, p["id"], req["full_name"], req["phone"], req["country"])
        )
        conn.execute("UPDATE registration_requests SET status='approved' WHERE id=?", (req_id,))
        log_audit(conn, p, "registration_approved", "registration_request", req_id, f"Approved {req['username']} as {role}", request)
    return {"message": "Approved", "userId": uid}

@router.post("/registration-requests/{req_id}/reject")
async def reject_reg_request(req_id: str, request: Request, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM registration_requests WHERE id=?", (req_id,)).fetchone()
        if not req: raise HTTPException(404)
        if req["status"] != "pending": raise HTTPException(400, "Registration request already processed")
        conn.execute("UPDATE registration_requests SET status='rejected' WHERE id=?", (req_id,))
        log_audit(conn, p, "registration_rejected", "registration_request", req_id, f"Rejected {req['username']}", request)
    return {"message": "Rejected"}

def _can_access_user(conn, actor, target):
    if actor["role"] == "admin":
        return True
    if actor["role"] == "manager":
        return target["id"] == actor["id"] or target["parent_id"] == actor["id"] or bool(conn.execute(
            "SELECT 1 FROM users parent WHERE parent.id=? AND parent.parent_id=?",
            (target["parent_id"], actor["id"]),
        ).fetchone())
    if actor["role"] == "reseller":
        return target["id"] == actor["id"] or target["parent_id"] == actor["id"]
    return target["id"] == actor["id"]

@router.put("/{item_id}")
async def update_user(item_id: str, body: UserUpdate, request: Request, p=Depends(get_current_user)):
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target: raise HTTPException(404)
        if not _can_access_user(conn, p, target): raise HTTPException(403)

        is_admin = p["role"] == "admin"
        is_manager = p["role"] == "manager"
        is_self = item_id == p["id"]

        updates = {}
        if body.email is not None: updates["email"] = body.email
        if body.fullName is not None: updates["full_name"] = body.fullName
        if body.phone is not None: updates["phone"] = body.phone
        if body.country is not None: updates["country"] = body.country
        if body.password:
            if not (is_admin or is_manager or is_self): raise HTTPException(403)
            updates["password"] = hash_password(body.password)

        if is_admin:
            if body.role:
                if body.role not in CAN_CREATE["admin"]: raise HTTPException(400, "Invalid role")
                updates["role"] = body.role
            if body.balance is not None: updates["balance"] = body.balance
            if body.status: updates["status"] = body.status
            if body.self_allocation_limit is not None: updates["self_allocation_limit"] = max(0, body.self_allocation_limit)
            if body.self_allocation_limit_enabled is not None: updates["self_allocation_limit_enabled"] = 1 if body.self_allocation_limit_enabled else 0
        elif is_manager:
            if target["role"] not in CAN_CREATE["manager"] and target["id"] != p["id"]:
                raise HTTPException(403, "Managers can only edit reseller/client accounts")
            if body.status and target["id"] != p["id"]:
                if body.status not in ("active", "suspended", "blocked", "pending", "rejected"):
                    raise HTTPException(400, "Invalid status")
                updates["status"] = body.status
            if body.self_allocation_limit is not None and target["role"] in ("reseller", "sub_reseller"):
                updates["self_allocation_limit"] = max(0, body.self_allocation_limit)
            if body.self_allocation_limit_enabled is not None and target["role"] in ("reseller", "sub_reseller"):
                updates["self_allocation_limit_enabled"] = 1 if body.self_allocation_limit_enabled else 0

        if updates:
            updates["updated_at"] = "datetime('now')"
            assignments = []
            values = []
            for key, value in updates.items():
                if key == "updated_at":
                    assignments.append("updated_at=datetime('now')")
                else:
                    assignments.append(f"{key}=?")
                    values.append(value)
            conn.execute(f"UPDATE users SET {','.join(assignments)} WHERE id=?", values + [item_id])
            log_audit(conn, p, "user_updated", "user", item_id, ", ".join(k for k in updates if k != "password"), request)
    return {"message": "Updated"}

@router.post("/{item_id}/status")
async def change_user_status(item_id: str, body: UserStatusAction, request: Request, p=Depends(require_role(["admin", "manager"]))):
    allowed_statuses = {"active", "suspended", "blocked", "pending", "rejected"}
    if body.status not in allowed_statuses:
        raise HTTPException(400, "Invalid status")
    if item_id == p["id"]:
        raise HTTPException(400, "You cannot change your own status")
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target: raise HTTPException(404)
        if not _can_access_user(conn, p, target): raise HTTPException(403)
        if p["role"] == "manager" and target["role"] not in ("reseller", "sub_reseller"):
            raise HTTPException(403, "Managers can only control reseller/client accounts")
        conn.execute("UPDATE users SET status=?, updated_at=datetime('now') WHERE id=?", (body.status, item_id))
        detail = f"{target['username']} -> {body.status}" + (f" ({body.note})" if body.note else "")
        log_audit(conn, p, "user_status_changed", "user", item_id, detail, request)
    return {"message": "Status updated", "status": body.status}

@router.get("/{item_id}/activity")
async def get_user_activity(item_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not user: raise HTTPException(404)
        if not _can_access_user(conn, p, user): raise HTTPException(403)
        username = user["username"]
        stats = {
            "smsTotal": conn.execute("SELECT COUNT(*) FROM sms_received WHERE assigned_to=?", (username,)).fetchone()[0],
            "smsToday": conn.execute("SELECT COUNT(*) FROM sms_received WHERE assigned_to=? AND date(received_at)=date('now')", (username,)).fetchone()[0],
            "numbersAssigned": conn.execute("SELECT COUNT(*) FROM numbers WHERE assigned_to=? AND status != 'test'", (username,)).fetchone()[0],
            "testNumbers": conn.execute("SELECT COUNT(*) FROM numbers WHERE assigned_to=? AND status='test'", (username,)).fetchone()[0],
            "totalPayout": conn.execute("SELECT COALESCE(SUM(profit),0) FROM sms_received WHERE assigned_to=?", (username,)).fetchone()[0],
            "pendingPayouts": conn.execute("SELECT COALESCE(SUM(amount),0) FROM payout_requests WHERE user_id=? AND status='pending'", (item_id,)).fetchone()[0],
            "allocations": conn.execute("SELECT COUNT(*) FROM allocations WHERE user_id=?", (item_id,)).fetchone()[0],
            "openTickets": conn.execute("SELECT COUNT(*) FROM support_tickets WHERE user_id=? AND status='open'", (item_id,)).fetchone()[0],
        }
        recent_sms = conn.execute("SELECT * FROM sms_received WHERE assigned_to=? ORDER BY received_at DESC LIMIT 10", (username,)).fetchall()
        numbers = conn.execute("SELECT * FROM numbers WHERE assigned_to=? ORDER BY assigned_at DESC LIMIT 25", (username,)).fetchall()
        payouts = conn.execute("SELECT * FROM payout_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 10", (item_id,)).fetchall()
        allocations = conn.execute("SELECT * FROM allocations WHERE user_id=? ORDER BY created_at DESC LIMIT 10", (item_id,)).fetchall()
    return {
        "stats": stats,
        "recentSms": [dict(r) for r in recent_sms],
        "numbers": [dict(r) for r in numbers],
        "payouts": [dict(r) for r in payouts],
        "allocations": [dict(r) for r in allocations],
    }

@router.get("/{item_id}")
async def get_user_profile(item_id: str, p=Depends(get_current_user)):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not user: raise HTTPException(404)
        if not _can_access_user(conn, p, user): raise HTTPException(403)
        data = dict(user)
        data.pop("password", None)
        return data

@router.get("/{item_id}/logs")
async def get_user_logs(item_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not user: raise HTTPException(404)
        if not _can_access_user(conn, p, user): raise HTTPException(403)
        logs = conn.execute("""
            SELECT * FROM audit_logs
            WHERE actor_username=? OR resource_id=?
            ORDER BY created_at DESC LIMIT 100
        """, (user["username"], item_id)).fetchall()
        return {"data": [dict(l) for l in logs]}

@router.delete("/{item_id}")
async def delete_user(item_id: str, p=Depends(require_role(["admin"]))):
    if item_id == p["id"]: raise HTTPException(400)
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id=?", (item_id,))
    return {"message": "Deleted"}

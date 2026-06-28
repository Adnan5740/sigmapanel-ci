"""Profile and notifications routes"""
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from database import get_db
from audit_utils import log_audit
from routes.deps import get_current_user
from datetime import datetime
import os
import secrets
from auth import hash_password, verify_password, generate_id

router = APIRouter()

class UpdateProfile(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None

class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str

class CreateNews(BaseModel):
    subject: str
    message: str

class CreateTicket(BaseModel):
    subject: str
    message: str

class ReplyTicket(BaseModel):
    message: str

# Profile Routes
@router.get("/api/users/me")
async def get_current_user_profile(p=Depends(get_current_user)):
    data = dict(p)
    data.pop("password", None)
    return data

@router.patch("/api/users/me")
async def update_profile(body: UpdateProfile, p=Depends(get_current_user)):
    updates = []
    params = []
    if body.fullName:
        updates.append("full_name=?")
        params.append(body.fullName)
    if body.email:
        updates.append("email=?")
        params.append(body.email)
    if body.phone:
        updates.append("phone=?")
        params.append(body.phone)
    if body.country:
        updates.append("country=?")
        params.append(body.country)
    
    if updates:
        params.append(p['id'])
        with get_db() as conn:
            conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=?", params)
    return {"message": "Profile updated"}

@router.post("/api/users/me/password")
async def change_password(body: ChangePassword, p=Depends(get_current_user)):
    with get_db() as conn:
        user = conn.execute("SELECT password FROM users WHERE id=?", (p['id'],)).fetchone()
        if not user or not verify_password(body.currentPassword, user['password']):
            raise HTTPException(400, "Current password is incorrect")
        new_hash = hash_password(body.newPassword)
        conn.execute("UPDATE users SET password=? WHERE id=?", (new_hash, p['id']))
    return {"message": "Password changed successfully"}

@router.post("/api/users/me/avatar")
async def upload_avatar(avatar: UploadFile = File(...), p=Depends(get_current_user)):
    allowed = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
    if avatar.content_type not in allowed:
        raise HTTPException(400, "Unsupported avatar file type")
    data = await avatar.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image size must be less than 5MB")
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads", "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{p['id']}_{secrets.token_hex(8)}{allowed[avatar.content_type]}"
    with open(os.path.join(upload_dir, filename), "wb") as fh:
        fh.write(data)
    avatar_url = f"/static/uploads/avatars/{filename}"
    with get_db() as conn:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
        if "avatar_url" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        conn.execute("UPDATE users SET avatar_url=? WHERE id=?", (avatar_url, p['id']))
    return {"avatar_url": avatar_url}

# Notifications Routes
@router.get("/api/notifications/news")
async def get_news(p=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM news ORDER BY created_at DESC LIMIT 50").fetchall()
        return {"data": [dict(r) for r in rows]}

@router.post("/api/notifications/news")
async def create_news(body: CreateNews, p=Depends(get_current_user)):
    if p['role'] not in ['admin', 'manager']:
        raise HTTPException(403, "Only admin/manager can post news")
    with get_db() as conn:
        news_id = generate_id()
        conn.execute("INSERT INTO news (id, subject, message, created_by, created_by_role) VALUES (?,?,?,?,?)",
                     (news_id, body.subject, body.message, p['username'], p['role']))
        log_audit(conn, p, "news_posted", "news", news_id, body.subject, None)
    return {"message": "News posted", "id": news_id}

@router.get("/api/notifications/support")
async def get_tickets(p=Depends(get_current_user)):
    with get_db() as conn:
        if p['role'] in ['admin', 'manager']:
            rows = conn.execute("SELECT * FROM support_tickets ORDER BY created_at DESC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC", (p['id'],)).fetchall()
        return {"data": [dict(r) for r in rows]}

@router.post("/api/notifications/support")
async def create_ticket(body: CreateTicket, p=Depends(get_current_user)):
    with get_db() as conn:
        ticket_id = generate_id()
        conn.execute("INSERT INTO support_tickets (id, user_id, username, subject, message) VALUES (?,?,?,?,?)",
                     (ticket_id, p['id'], p['username'], body.subject, body.message))
    return {"message": "Ticket created", "id": ticket_id}

@router.get("/api/notifications/support/{ticket_id}")
async def get_ticket(ticket_id: str, p=Depends(get_current_user)):
    with get_db() as conn:
        ticket = conn.execute("SELECT * FROM support_tickets WHERE id=?", (ticket_id,)).fetchone()
        if not ticket:
            raise HTTPException(404, "Ticket not found")
        if p['role'] not in ['admin', 'manager'] and ticket['user_id'] != p['id']:
            raise HTTPException(403, "Access denied")
        return dict(ticket)

@router.post("/api/notifications/support/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, body: ReplyTicket, request: Request, p=Depends(get_current_user)):
    if p['role'] not in ['admin', 'manager']:
        raise HTTPException(403, "Only admin/manager can reply")
    with get_db() as conn:
        ticket = conn.execute("SELECT * FROM support_tickets WHERE id=?", (ticket_id,)).fetchone()
        if not ticket: raise HTTPException(404, "Ticket not found")
        conn.execute("UPDATE support_tickets SET reply=?, reply_by=?, reply_by_role=?, status='open', updated_at=datetime('now') WHERE id=?",
                     (body.message, p['username'], p['role'], ticket_id))
        log_audit(conn, p, "support_ticket_replied", "support_ticket", ticket_id, ticket['subject'], request)
    return {"message": "Reply sent"}

@router.post("/api/notifications/support/{ticket_id}/close")
async def close_ticket(ticket_id: str, request: Request, p=Depends(get_current_user)):
    if p['role'] not in ['admin', 'manager']:
        raise HTTPException(403, "Only admin/manager can close tickets")
    with get_db() as conn:
        ticket = conn.execute("SELECT * FROM support_tickets WHERE id=?", (ticket_id,)).fetchone()
        if not ticket: raise HTTPException(404, "Ticket not found")
        conn.execute("UPDATE support_tickets SET status='closed', updated_at=datetime('now') WHERE id=?", (ticket_id,))
        log_audit(conn, p, "support_ticket_closed", "support_ticket", ticket_id, ticket['subject'], request)
    return {"message": "Ticket closed"}

from fastapi import Request, HTTPException, Depends, Query
from typing import Optional
from auth import extract_token, verify_token
from database import get_db


def get_current_user(request: Request, token: Optional[str] = Query(None)):
    """Accept auth via Authorization header (JWT) or ?token=<api_token> query param."""
    # 1. Try Authorization header (JWT login token)
    auth_header = request.headers.get('Authorization')
    jwt = extract_token(auth_header)

    if jwt:
        payload = verify_token(jwt)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE id = ?", (payload['userId'],)).fetchone()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            if user['status'] in ('blocked', 'suspended'):
                raise HTTPException(status_code=403, detail="Account is restricted")
            return dict(user)

    # 2. Try ?token=<api_token> query param (static API token for external SMS fetches)
    if token:
        with get_db() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE api_token = ?", (token,)
            ).fetchone()
            if user:
                if user['status'] in ('blocked', 'suspended'):
                    raise HTTPException(status_code=403, detail="Account is restricted")
                return dict(user)

    raise HTTPException(status_code=401, detail="Authentication required")


def require_role(roles: list):
    def role_checker(request: Request, token: Optional[str] = Query(None)):
        user = get_current_user(request, token)
        if user['role'] not in roles:
            raise HTTPException(status_code=403, detail="Permission denied")
        return user
    return role_checker

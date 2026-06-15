"""SMS Webhook - clean POST/GET endpoint for REVE SMS HTTP API format"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from sms_processor import process_incoming_sms
from database import get_db

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

async def get_authenticated_user_by_token(request: Request):
    """Internal helper to authenticate webhook requests via secret_token"""
    # 1. Try to get token from query params or form/json body
    token = request.query_params.get("secret_token") or request.query_params.get("token")

    if not token:
        # If not in query, try body for POST requests
        if request.method == "POST":
            try:
                # We need to be careful with reading the body as it might be needed later
                # However, for webhooks, we usually can read it once.
                # To be safe, we can try to peek at the body if it's form data or json
                ct = request.headers.get("content-type", "")
                if "application/json" in ct:
                    body = await request.json()
                    token = body.get("secret_token") or body.get("token")
                elif "application/x-www-form-urlencoded" in ct or "multipart" in ct:
                    body = await request.form()
                    token = body.get("secret_token") or body.get("token")
            except Exception:
                pass

    if not token:
        # Check Authorization header as fallback
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif auth_header:
            token = auth_header.strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE api_token = ?", (token,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")

        if user['status'] != 'active':
            raise HTTPException(status_code=403, detail="Account is not active")

        return user

@router.post("/receive")
@router.get("/receive")
async def webhook_receive(request: Request):
    try:
        # Authenticate first
        user = await get_authenticated_user_by_token(request)

        if request.method == "POST":
            ct = request.headers.get("content-type", "")
            if "application/json" in ct:
                payload = await request.json()
            else:
                payload = dict(await request.form())
        else:
            payload = dict(request.query_params)

        if not payload:
             return JSONResponse(status_code=400, content={"error": "Empty payload"})

        result = process_incoming_sms(payload, auth_user=user)
        return JSONResponse(content={"status": "ok", "result": "processed"})

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

@router.post("/sms")
async def webhook_sms(request: Request):
    try:
        # Authenticate first
        user = await get_authenticated_user_by_token(request)

        ct = request.headers.get("content-type", "")
        if "application/json" in ct:
            try: payload = await request.json()
            except Exception: raise HTTPException(400, "Invalid JSON payload")
        elif "application/x-www-form-urlencoded" in ct or "multipart" in ct:
            form = await request.form()
            payload = dict(form)
        else:
            try: payload = await request.json()
            except Exception:
                text = await request.body()
                try:
                    import json; payload = json.loads(text)
                except Exception: raise HTTPException(400, "Unsupported content type")

        result = process_incoming_sms(payload, auth_user=user)

        if isinstance(result, list):
            ok = sum(1 for r in result if r.get("success"))
            return JSONResponse(content={"status": "ok", "processed": len(result), "success": ok, "failed": len(result)-ok})

        if result.get("success"):
            return JSONResponse(content={
                "status": "ok",
                "smsId": result.get("smsId"),
                "number": result.get("number"),
                "otp": result.get("otp"),
                "service": result.get("service"),
            })

        raise HTTPException(400, result.get("error", "Failed to process SMS"))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Internal server error")

@router.get("/sms")
async def webhook_health():
    return {"status": "ok"}

"""SMS Webhook - clean POST/GET endpoint for REVE SMS HTTP API format"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from sms_processor import process_incoming_sms
from routes.deps import require_role

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

@router.post("/receive")
@router.get("/receive")
async def webhook_receive(request: Request):
    try:
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

        payload["ip_address"] = request.client.host if request.client else None
        result = process_incoming_sms(payload)
        if result.get("success"):
            return JSONResponse(content={
                "status": "ok", "message": "processed",
                "smsId": result.get("smsId"), "number": result.get("number"),
                "sender": result.get("sender"), "service": result.get("service"),
                "otp": result.get("otp"),
            })
        return JSONResponse(status_code=400, content={
            "status": "failed",
            "error": result.get("error", "Failed to process SMS"),
            "missingFields": result.get("missingFields", []),
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/sms")
async def webhook_sms(request: Request):
    try:
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

        payload["ip_address"] = request.client.host if request.client else None
        result = process_incoming_sms(payload)

        if isinstance(result, list):
            ok = sum(1 for r in result if r.get("success"))
            return JSONResponse(content={"status": "ok", "processed": len(result), "success": ok, "failed": len(result)-ok})

        if result.get("success"):
            return JSONResponse(content={
                "status": "ok", "smsId": result.get("smsId"),
                "number": result.get("number"), "otp": result.get("otp"),
                "service": result.get("service"),
            })

        detail = {"error": result.get("error", "Failed to process SMS")}
        if result.get("missingFields"):
            detail["missingFields"] = result["missingFields"]
        raise HTTPException(400, detail)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Internal server error")

@router.get("/sms")
async def webhook_health():
    return {"status": "ok"}

# Provider postback — IP-locked to 51.38.107.49
PROVIDER_POSTBACK_IPS = {"51.38.107.49"}

@router.post("/postback")
@router.get("/postback")
async def webhook_postback(request: Request):
    client_ip = request.client.host if request.client else ""
    if client_ip not in PROVIDER_POSTBACK_IPS:
        return JSONResponse(status_code=403, content={"error": "Forbidden"})

    if request.method == "POST":
        ct = request.headers.get("content-type", "")
        raw = await request.json() if "application/json" in ct else dict(await request.form())
    else:
        raw = dict(request.query_params)

    payload = {
        "to":   raw.get("called_number"),
        "from": raw.get("senderid"),
        "msg":  raw.get("smstext"),
        "uuid": raw.get("smsid") or raw.get("smsid2"),
        "ip_address": client_ip,
    }
    result = process_incoming_sms(payload)
    return JSONResponse(content={"status": "ok" if result.get("success") else "failed"})

@router.post("/test")
async def webhook_test(request: Request, p=Depends(require_role(["admin", "manager"]))):
    """Internal test endpoint — no IP restriction, accepts both standard and postback field names."""
    ct = request.headers.get("content-type", "")
    raw = await request.json() if "application/json" in ct else dict(await request.form())
    payload = {
        "to":   raw.get("to") or raw.get("called_number"),
        "from": raw.get("from") or raw.get("senderid"),
        "msg":  raw.get("msg") or raw.get("smstext"),
        "uuid": raw.get("uuid") or raw.get("smsid"),
        "ip_address": request.client.host if request.client else None,
    }
    result = process_incoming_sms(payload)
    return JSONResponse(content={
        "status":  "ok" if result.get("success") else "failed",
        "smsId":   result.get("smsId"),
        "otp":     result.get("otp"),
        "service": result.get("service"),
        "error":   result.get("error"),
    })

@router.post("/debug")
@router.get("/debug")
async def webhook_debug(request: Request):
    """Capture and log ALL fields from provider — for debugging unknown field names."""
    import json as _json
    if request.method == "POST":
        ct = request.headers.get("content-type", "")
        if "application/json" in ct:
            raw = await request.json()
        else:
            form = await request.form()
            raw = dict(form)
    else:
        raw = dict(request.query_params)

    client_ip = request.client.host if request.client else "unknown"
    import logging
    logging.getLogger("webhook_debug").warning(
        f"DEBUG WEBHOOK from {client_ip}: {_json.dumps(raw)}"
    )

    # Try to process it anyway with all known field names
    payload = dict(raw)
    payload["ip_address"] = client_ip
    result = process_incoming_sms(payload)

    return {"status": "received", "fields": list(raw.keys()), "processed": result.get("success"), "smsId": result.get("smsId")}

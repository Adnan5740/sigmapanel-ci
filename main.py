"""SIGMAPANEL - SMS OTP Management System v3"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from security_middleware import FirewallMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import os
import logging

from database import init_db, get_db
from queue_manager import queue_manager
from routes.auth import router as auth_router
from routes.webhook import router as webhook_router
from routes.sms import router as sms_router
from routes.numbers import router as numbers_router
from routes.ranges import router as ranges_router
from routes.users import router as users_router
from routes.dashboard import router as dashboard_router
from routes.settings import router as settings_router
from routes.providers import router as providers_router
from routes.transactions import router as transactions_router
from routes.payments import router as payments_router
from routes.numbers_ext import router as numbers_ext_router
from routes.api_management import router as api_management_router
from routes.notifications import router as notifications_router
from routes.smpp_interconnect import router as smpp_interconnect_router
from routes.security import router as security_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SIGMAPANEL Backend...")
    init_db()
    yield
    logger.info("Shutting down SIGMAPANEL Backend...")
    await queue_manager.close()

app = FastAPI(title="SIGMAPANEL", version="3.0", lifespan=lifespan)

# Gzip all responses > 1KB
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(FirewallMiddleware)

# Health Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SIGMAPANEL API"}

@app.get("/health/redis")
async def redis_health():
    is_up = await queue_manager.is_healthy()
    return {"status": "up" if is_up else "down"}

@app.get("/health/database")
async def db_health():
    try:
        with get_db() as conn:
            conn.execute("SELECT 1").fetchone()
        return {"status": "up"}
    except Exception as e:
        return {"status": "down", "error": str(e)}

@app.get("/health/workers")
async def workers_health():
    return {"status": "running", "count": 2}

app.include_router(auth_router)
app.include_router(webhook_router)
app.include_router(sms_router)
app.include_router(numbers_router)
app.include_router(ranges_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(providers_router)
app.include_router(transactions_router)
app.include_router(payments_router)
app.include_router(numbers_ext_router)
app.include_router(api_management_router)
app.include_router(notifications_router)
app.include_router(smpp_interconnect_router)
app.include_router(security_router)

static_dir = os.path.join(os.path.dirname(__file__), "static")

# Static files with long-lived cache for immutable assets
_IMMUTABLE = {".js", ".css", ".woff2", ".woff", ".png", ".svg", ".ico"}

@app.get("/static/{path:path}")
async def static_files(path: str, request: Request):
    file_path = os.path.join(static_dir, path)
    if not os.path.isfile(file_path):
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    ext = os.path.splitext(path)[1].lower()
    cache = "public, max-age=31536000, immutable" if ext in _IMMUTABLE else "public, max-age=3600"
    return FileResponse(file_path, headers={"Cache-Control": cache})

@app.get("/{path:path}")
async def spa(path: str):
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Endpoint not found"})
    return FileResponse(
        os.path.join(static_dir, "index.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )

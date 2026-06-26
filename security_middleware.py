import ipaddress
import logging
import os
import re
import time
from datetime import datetime, timedelta

from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

from auth import generate_id
from database import get_db

logger = logging.getLogger("firewall")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
TRUST_PROXY_HEADERS_SETTING = os.environ.get("TRUST_PROXY_HEADERS", "auto").strip().lower()
_AUTO_BLOCK_MINUTES = int(os.environ.get("FIREWALL_AUTO_BLOCK_MINUTES", "60"))

# Path prefixes that should never be exposed on this panel.
_BLOCKED_PATHS = (
    "/.env", "/.git", "/wp-admin", "/wp-login", "/phpmyadmin", "/admin.php",
    "/xmlrpc.php", "/.aws", "/config.php", "/server-status", "/vendor/phpunit",
    "/actuator", "/solr", "/cgi-bin", "/.svn", "/.hg", "/backup", "/backups",
)

# Lower limits for sensitive endpoints (requests per minute per IP).
_AUTH_PATHS = ("/api/auth/login", "/api/auth/signup", "/api/auth/upload-proof")
_AUTH_RATE_LIMIT = 12
_GENERAL_RATE_LIMIT = 100
_API_RATE_LIMIT = 180

# Block obvious automated scanners while allowing legitimate API clients.
_SUSPICIOUS_UA_PATTERNS = (
    r"^$",
    r"sqlmap",
    r"nikto",
    r"masscan",
    r"\bnmap\b",
    r"dirbuster",
    r"gobuster",
    r"acunetix",
    r"nessus",
    r"hydra",
    r"zgrab",
    r"wpscan",
    r"python-requests/\d+\.\d+$",
)

_SUSPICIOUS_PATH_RE = re.compile(
    r"(\.\.|%2e%2e|%252e%252e|/etc/passwd|/proc/self|cmd=|exec=|eval\(|base64_decode|select.+from|union.+select|sleep\(|benchmark\()",
    re.I,
)
_DANGEROUS_EXTENSION_RE = re.compile(r"\.(?:php[0-9]?|phtml|asp|aspx|jsp|cgi|pl)(?:$|[?#])", re.I)
_SUSPICIOUS_UA_RE = tuple(re.compile(p, re.I) for p in _SUSPICIOUS_UA_PATTERNS)


class FirewallMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis = None
        self._last_reconnect = 0
        self._db_block_cache = {}

    async def _get_redis(self):
        now = time.time()
        if self.redis is None and now - self._last_reconnect > 10:
            try:
                self.redis = redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0,
                )
                await self.redis.ping()
            except Exception:
                self.redis = None
                self._last_reconnect = now
        return self.redis

    def _valid_ip(self, value: str | None) -> str | None:
        if not value:
            return None
        candidate = value.strip().split(",")[0].strip()
        if not candidate:
            return None
        if candidate.startswith("[") and "]" in candidate:
            candidate = candidate[1:candidate.index("]")]
        elif candidate.count(":") == 1 and candidate.rsplit(":", 1)[1].isdigit():
            candidate = candidate.rsplit(":", 1)[0]
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            return None

    def _trust_proxy_headers(self, request: Request) -> bool:
        if TRUST_PROXY_HEADERS_SETTING in {"1", "true", "yes", "on"}:
            return True
        if TRUST_PROXY_HEADERS_SETTING in {"0", "false", "no", "off"}:
            return False
        peer = self._valid_ip(request.client.host if request.client else None)
        if not peer:
            return False
        try:
            peer_ip = ipaddress.ip_address(peer)
            return peer_ip.is_private or peer_ip.is_loopback or peer_ip.is_link_local
        except ValueError:
            return False

    def _client_ip(self, request: Request) -> str:
        if self._trust_proxy_headers(request):
            for header in ("cf-connecting-ip", "true-client-ip", "x-real-ip", "x-forwarded-for"):
                ip = self._valid_ip(request.headers.get(header))
                if ip:
                    return ip
        if request.client:
            return self._valid_ip(request.client.host) or request.client.host
        return "unknown"

    def _is_blocked_path(self, path: str) -> bool:
        lowered = path.lower()
        return any(lowered == blocked or lowered.startswith(blocked + "/") for blocked in _BLOCKED_PATHS)

    def _is_suspicious_ua(self, user_agent: str) -> bool:
        ua = (user_agent or "").strip()
        return any(pattern.search(ua) for pattern in _SUSPICIOUS_UA_RE)

    def _is_probe_request(self, request: Request) -> bool:
        path = request.url.path
        if path.startswith("/static/"):
            return False
        raw_target = f"{path}?{request.url.query}" if request.url.query else path
        if _DANGEROUS_EXTENSION_RE.search(raw_target):
            return True
        if path.startswith(("/api/webhook", "/api/sms")):
            # SMS payloads can legitimately contain arbitrary text. Keep probe rules path-only here.
            return bool(_SUSPICIOUS_PATH_RE.search(path))
        return bool(_SUSPICIOUS_PATH_RE.search(raw_target))

    def _rate_limit_for_path(self, path: str) -> int:
        if path.startswith(_AUTH_PATHS):
            return _AUTH_RATE_LIMIT
        if path.startswith("/api/"):
            return _API_RATE_LIMIT
        return _GENERAL_RATE_LIMIT

    async def _check_rate_limit(self, r, client_ip: str, path: str) -> bool:
        if not r:
            return True
        limit = self._rate_limit_for_path(path)
        key = f"rate_limit:{client_ip}:{path.split('?')[0]}"
        current = await r.get(key)
        if current and int(current) > limit:
            return False
        async with r.pipeline() as pipe:
            await pipe.incr(key)
            await pipe.expire(key, 60)
            await pipe.execute()
        return True

    def _db_ip_blocked(self, client_ip: str) -> bool:
        if client_ip == "unknown":
            return False
        now_ts = time.time()
        cached = self._db_block_cache.get(client_ip)
        if cached and cached["until"] > now_ts:
            return cached["blocked"]
        blocked = False
        try:
            now_iso = datetime.utcnow().isoformat()
            with get_db() as conn:
                conn.execute("DELETE FROM blocked_ips WHERE expires_at IS NOT NULL AND expires_at <= ?", (now_iso,))
                row = conn.execute(
                    "SELECT id FROM blocked_ips WHERE ip_address = ? AND (expires_at IS NULL OR expires_at > ?) LIMIT 1",
                    (client_ip, now_iso),
                ).fetchone()
                blocked = row is not None
        except Exception as exc:
            logger.error("Blocked IP lookup failed: %s", exc)
        self._db_block_cache[client_ip] = {"blocked": blocked, "until": now_ts + 15}
        return blocked

    def _log_security_event(
        self,
        client_ip: str,
        event_type: str,
        severity: str,
        action_taken: str,
        detail: str,
    ) -> None:
        try:
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO security_events (id, ip_address, event_type, severity, action_taken, detail)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (generate_id(), client_ip, event_type, severity, action_taken, detail[:1000]),
                )
        except Exception as exc:
            logger.error("Failed to log firewall event: %s", exc)

    def _persist_auto_block(self, client_ip: str, reason: str) -> None:
        if client_ip == "unknown":
            return
        expires = (datetime.utcnow() + timedelta(minutes=_AUTO_BLOCK_MINUTES)).isoformat()
        try:
            with get_db() as conn:
                conn.execute(
                    """INSERT INTO blocked_ips (id, ip_address, reason, expires_at)
                       VALUES (?, ?, ?, ?)
                       ON CONFLICT(ip_address) DO UPDATE SET reason=excluded.reason, expires_at=excluded.expires_at""",
                    (generate_id(), client_ip, reason, expires),
                )
            self._db_block_cache[client_ip] = {"blocked": True, "until": time.time() + 15}
        except Exception as exc:
            logger.error("Failed to persist firewall block: %s", exc)

    def _recent_auth_failures(self, client_ip: str) -> int:
        try:
            with get_db() as conn:
                return conn.execute(
                    """SELECT COUNT(*) FROM security_events
                       WHERE ip_address = ? AND event_type = 'AUTH_FAILURE'
                         AND datetime(created_at) >= datetime('now', '-15 minutes')""",
                    (client_ip,),
                ).fetchone()[0]
        except Exception as exc:
            logger.error("Failed to count auth failures: %s", exc)
            return 1

    async def _track_auth_failure(self, r, client_ip: str) -> None:
        if client_ip == "unknown":
            return
        self._log_security_event(client_ip, "AUTH_FAILURE", "warning", "observed", "Failed login attempt")
        count = self._recent_auth_failures(client_ip)
        if r:
            key = f"auth_fail:{client_ip}"
            redis_count = await r.incr(key)
            if redis_count == 1:
                await r.expire(key, 900)
            count = max(count, redis_count)
        if count >= 15:
            if r:
                await r.sadd("blacklisted_ips", client_ip)
            self._persist_auto_block(client_ip, "Repeated failed login attempts")
            self._log_security_event(
                client_ip,
                "AUTH_BRUTE_FORCE",
                "critical",
                "auto_blocked",
                f"IP auto-blocked after {count} failed auth attempts",
            )
            logger.warning("IP auto-blacklisted after repeated auth failures: %s", client_ip)

    def _security_headers(self, response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, nosnippet"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com "
            "https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net;"
        )
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        return response

    def _deny(self, request: Request, status_code: int, detail: str, event_id: str | None = None):
        payload = {"detail": detail}
        if event_id:
            payload["eventId"] = event_id
        if request.url.path.startswith("/api/"):
            response = JSONResponse(status_code=status_code, content=payload)
        else:
            title = "Security Check"
            response = HTMLResponse(
                status_code=status_code,
                content=f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a}}.box{{width:min(440px,calc(100vw - 32px));background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 18px 50px rgba(99,102,241,.14);padding:28px;text-align:center}}.mark{{width:54px;height:54px;border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;background:#eef2ff;color:#4f46e5}}h1{{font-size:22px;margin:0 0 8px}}p{{font-size:14px;line-height:1.55;color:#64748b;margin:0}}code{{display:inline-block;margin-top:14px;color:#64748b;font-size:12px}}</style></head><body><main class="box"><div class="mark">&#128737;</div><h1>Request blocked</h1><p>{detail}</p>{f'<code>Event: {event_id}</code>' if event_id else ''}</main></body></html>""",
            )
        response.headers["Cache-Control"] = "no-store"
        return self._security_headers(response)

    async def dispatch(self, request: Request, call_next):
        client_ip = self._client_ip(request)
        path = request.url.path
        user_agent = request.headers.get("user-agent", "")

        if self._is_blocked_path(path):
            self._log_security_event(client_ip, "BLOCKED_PATH", "high", "blocked", f"Blocked sensitive path: {path}")
            return self._deny(request, 404, "Not found")

        if self._is_probe_request(request):
            self._log_security_event(client_ip, "PROBE_REQUEST", "high", "blocked", f"Probe pattern: {request.url.path}")
            return self._deny(request, 403, "Request blocked by firewall policy")

        if self._is_suspicious_ua(user_agent) and not path.startswith("/static/"):
            detail = f"Suspicious user-agent: {user_agent[:180]}"
            self._log_security_event(client_ip, "SCANNER_USER_AGENT", "high", "blocked", detail)
            logger.warning("Blocked suspicious user-agent from %s: %s", client_ip, user_agent[:120])
            return self._deny(request, 403, "Access denied by firewall policy")

        if self._db_ip_blocked(client_ip):
            self._log_security_event(client_ip, "BLOCKED_IP", "critical", "blocked", "IP matched active firewall blacklist")
            return self._deny(request, 403, "IP access denied by security restriction")

        r = await self._get_redis()
        try:
            if r and await r.sismember("blacklisted_ips", client_ip):
                self._persist_auto_block(client_ip, "Redis firewall blacklist")
                self._log_security_event(client_ip, "REDIS_BLACKLIST", "critical", "blocked", "IP matched Redis blacklist")
                return self._deny(request, 403, "IP access denied by security restriction")

            if not await self._check_rate_limit(r, client_ip, path):
                self._log_security_event(client_ip, "RATE_LIMIT", "warning", "throttled", f"Rate limit exceeded for {path}")
                return self._deny(request, 429, "Too many requests. Please slow down.")
        except Exception as e:
            logger.error("Firewall error: %s", e)
            self.redis = None

        response = await call_next(request)

        try:
            if path.startswith("/api/auth/login") and response.status_code in (401, 423):
                await self._track_auth_failure(r, client_ip)
        except Exception as e:
            logger.error("Auth failure tracking error: %s", e)

        return self._security_headers(response)

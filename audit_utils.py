from typing import Optional

from auth import generate_id


def log_audit(
    conn,
    actor: Optional[dict],
    action: str,
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[str] = None,
    request=None,
):
    ip_address = None
    if request is not None:
        forwarded = request.headers.get("x-forwarded-for")
        ip_address = forwarded.split(",")[0].strip() if forwarded else getattr(request.client, "host", None)

    conn.execute(
        """INSERT INTO audit_logs
           (id, actor_id, actor_username, action, resource, resource_id, detail, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            generate_id(),
            actor.get("id") if actor else None,
            actor.get("username") if actor else None,
            action,
            resource,
            resource_id,
            detail,
            ip_address,
        ),
    )

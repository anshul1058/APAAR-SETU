"""Audit logging helper (backend_guide.md §9).

Write an `audit_logs` row for: login, upload, student edit, dashboard export,
assistant query, verification request and confirm. NEVER log OTPs, passwords
or full PII.
"""
from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditLog


def client_ip(request: Request | None) -> str:
    if request is None:
        return ""
    if request.client:
        return request.client.host
    return ""


def audit(
    db: Session,
    user: dict | None,
    action: str,
    resource: str = "",
    resource_id: str | int = "",
    request: Request | None = None,
) -> None:
    """Insert one audit row. Does not commit — caller's transaction decides."""
    entry = AuditLog(
        user_id=(user or {}).get("sub"),
        role=(user or {}).get("role", ""),
        action=action,
        resource=resource,
        resource_id=str(resource_id or ""),
        ip=client_ip(request),
    )
    db.add(entry)

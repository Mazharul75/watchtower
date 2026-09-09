"""
Cross-service authentication: apps/web (Next.js/Auth.js) owns login, but
apps/api validates the SAME session by reading the Auth.js database-session
cookie directly out of the Session table it shares with Prisma — no JWT,
no shared secret to keep in sync, just one row lookup. This is the point of
choosing Auth.js's "database" session strategy over JWT in Phase 1.
"""
from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models import ROLE_RANK, ApiKey, OrganizationMember, OrgRole, User
from app.models import Session as SessionModel

settings = get_settings()
SESSION_COOKIE_NAME = "__Secure-authjs.session-token" if settings.is_production else "authjs.session-token"


async def _authenticate_via_api_key(token: str, db: AsyncSession) -> User | None:
    """
    Accepts `Authorization: Bearer <key>`, as an alternative to the browser
    session cookie — this is what lets a script or CI job call apps/api
    without a logged-in browser session. Keys are created on the web app's
    Account settings page and hashed the same way here as there (SHA-256 of
    the raw key), so a lookup is a single indexed equality check.
    """
    key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    result = await db.execute(select(ApiKey).where(ApiKey.keyHash == key_hash))
    api_key = result.scalar_one_or_none()
    if api_key is None or api_key.revokedAt is not None:
        return None

    user_result = await db.execute(select(User).where(User.id == api_key.userId))
    user = user_result.scalar_one_or_none()
    if user is None:
        return None

    api_key.lastUsedAt = datetime.now(UTC)
    await db.commit()
    return user


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        user = await _authenticate_via_api_key(auth_header[len("bearer ") :].strip(), db)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked API key")
        return user

    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    result = await db.execute(select(SessionModel).where(SessionModel.sessionToken == token))
    session_row = result.scalar_one_or_none()
    if session_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    if session_row.expires.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    user_result = await db.execute(select(User).where(User.id == session_row.userId))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if not user.isSuperAdmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


def require_org_role(min_role: OrgRole):
    """Dependency factory: require_org_role(OrgRole.ADMIN) as a route dependency."""

    async def _dependency(
        organization_id: str,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> OrganizationMember:
        result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organizationId == organization_id,
                OrganizationMember.userId == user.id,
            )
        )
        membership = result.scalar_one_or_none()
        if membership is None or ROLE_RANK[membership.role] < ROLE_RANK[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {min_role.value} role or higher in this organization",
            )
        return membership

    return _dependency

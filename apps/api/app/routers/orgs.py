from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps.auth import require_org_role
from app.models import OrganizationMember, OrgRole, User

router = APIRouter(prefix="/orgs", tags=["orgs"])


class MemberResponse(BaseModel):
    userId: str
    email: str
    name: str | None
    role: OrgRole


@router.get("/{organization_id}/members", response_model=list[MemberResponse])
async def list_members(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    _membership: OrganizationMember = Depends(require_org_role(OrgRole.VIEWER)),
) -> list[MemberResponse]:
    """Any member (VIEWER or above) can see the roster — enforced by require_org_role."""
    result = await db.execute(
        select(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.userId)
        .where(OrganizationMember.organizationId == organization_id)
    )
    return [
        MemberResponse(userId=user.id, email=user.email, name=user.name, role=member.role)
        for member, user in result.all()
    ]

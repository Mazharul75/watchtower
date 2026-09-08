from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps.auth import require_super_admin
from app.models import Organization, User

router = APIRouter(prefix="/admin", tags=["admin"])


class PlatformStats(BaseModel):
    totalUsers: int
    totalOrganizations: int


@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_super_admin),
) -> PlatformStats:
    user_count = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    org_count = (await db.execute(select(func.count()).select_from(Organization))).scalar_one()
    return PlatformStats(totalUsers=user_count, totalOrganizations=org_count)

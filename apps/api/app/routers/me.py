from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps.auth import get_current_user
from app.models import User

router = APIRouter(tags=["me"])


class MeResponse(BaseModel):
    id: str
    name: str | None
    username: str | None
    email: str
    isSuperAdmin: bool
    emailVerified: bool


@router.get("/me", response_model=MeResponse)
async def read_me(user: User = Depends(get_current_user)) -> MeResponse:
    """
    Proves apps/api enforces the same RBAC boundary as apps/web: this route
    resolves the identical Auth.js session cookie independently, with no
    shared secret beyond the Postgres connection itself.
    """
    return MeResponse(
        id=user.id,
        name=user.name,
        username=user.username,
        email=user.email,
        isSuperAdmin=user.isSuperAdmin,
        emailVerified=user.emailVerified is not None,
    )

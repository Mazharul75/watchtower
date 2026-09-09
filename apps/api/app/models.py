"""
SQLAlchemy models mirroring the Prisma schema in apps/web/prisma/schema.prisma.

Prisma is the single source of truth for migrations (see docs/ADR-001) — these
models exist purely so apps/api can query the same Postgres tables (to resolve
the Auth.js session cookie into a user, and to enforce org-role RBAC) without
ever running its own migrations. Table names are exact matches of the Prisma
model names (Prisma does not snake_case by default), which is why they're
capitalized here — that capitalization must never drift from the .prisma file.
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class OrgRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


ROLE_RANK = {OrgRole.VIEWER: 0, OrgRole.MEMBER: 1, OrgRole.ADMIN: 2, OrgRole.OWNER: 3}


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    username: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    emailVerified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    isSuperAdmin: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    memberships: Mapped[list[OrganizationMember]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "Session"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    sessionToken: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    expires: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Organization(Base):
    __tablename__ = "Organization"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    members: Mapped[list[OrganizationMember]] = relationship(back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "OrganizationMember"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    organizationId: Mapped[str] = mapped_column(String, ForeignKey("Organization.id"))
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole, name="OrgRole"), default=OrgRole.MEMBER)

    user: Mapped[User] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(back_populates="members")


class AuditLog(Base):
    __tablename__ = "AuditLog"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    actorId: Mapped[str | None] = mapped_column(String, ForeignKey("User.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    targetType: Mapped[str | None] = mapped_column(String, nullable=True)
    targetId: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class FeatureFlag(Base):
    __tablename__ = "FeatureFlag"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)


class ApiKey(Base):
    """
    Personal API keys, created from the web app's Account settings page.
    Only a SHA-256 hash of the raw key is ever stored — the raw value is
    shown to the user exactly once, at creation time. Unlike password
    hashing, this deliberately uses a fast deterministic hash (not Argon2):
    the whole point of an API key is a cheap O(1) lookup-by-hash on every
    request, and a key already carries 256 bits of its own randomness, so
    it needs no salt/slow-hash defense the way a human-chosen password does.
    """

    __tablename__ = "ApiKey"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    keyHash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id"))
    lastUsedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revokedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

import uuid
from datetime import UTC, datetime, timedelta

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import get_db
from app.main import app
from app.models import Base, Organization, OrganizationMember, OrgRole, User
from app.models import Session as SessionModel

# In-memory SQLite for fast, isolated tests — the app's actual production
# database is Postgres (see docs/ADR-001); these tests exercise the same
# SQLAlchemy models/queries, which are portable across both.
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_user(db_session: AsyncSession):
    user = User(
        id=str(uuid.uuid4()),
        name="Test User",
        username="testuser",
        email="test@example.com",
        emailVerified=datetime.now(UTC),
        isSuperAdmin=False,
        createdAt=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()

    token = str(uuid.uuid4())
    session_row = SessionModel(
        id=str(uuid.uuid4()),
        sessionToken=token,
        userId=user.id,
        expires=datetime.now(UTC) + timedelta(days=1),
    )
    db_session.add(session_row)
    await db_session.commit()

    return user, token


@pytest_asyncio.fixture
async def seeded_admin(db_session: AsyncSession):
    user = User(
        id=str(uuid.uuid4()),
        name="Admin User",
        username="admin",
        email="admin@example.com",
        emailVerified=datetime.now(UTC),
        isSuperAdmin=True,
        createdAt=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()

    token = str(uuid.uuid4())
    session_row = SessionModel(
        id=str(uuid.uuid4()),
        sessionToken=token,
        userId=user.id,
        expires=datetime.now(UTC) + timedelta(days=1),
    )
    db_session.add(session_row)
    await db_session.commit()

    return user, token


@pytest_asyncio.fixture
async def seeded_org_with_viewer(db_session: AsyncSession, seeded_user):
    user, token = seeded_user
    org = Organization(id=str(uuid.uuid4()), name="Test Org", slug="test-org", createdAt=datetime.now(UTC))
    db_session.add(org)
    await db_session.flush()

    membership = OrganizationMember(
        id=str(uuid.uuid4()), organizationId=org.id, userId=user.id, role=OrgRole.VIEWER
    )
    db_session.add(membership)
    await db_session.commit()

    return org, user, token

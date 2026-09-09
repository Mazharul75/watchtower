from datetime import UTC

import pytest

pytestmark = pytest.mark.asyncio


async def test_me_requires_authentication(client):
    res = await client.get("/me")
    assert res.status_code == 401


async def test_me_rejects_unknown_session_token(client):
    res = await client.get("/me", cookies={"authjs.session-token": "not-a-real-token"})
    assert res.status_code == 401


async def test_me_returns_the_authenticated_user(client, seeded_user):
    user, token = seeded_user
    res = await client.get("/me", cookies={"authjs.session-token": token})
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == user.id
    assert body["email"] == "test@example.com"
    assert body["isSuperAdmin"] is False


async def test_me_rejects_unknown_api_key(client):
    res = await client.get("/me", headers={"Authorization": "Bearer wt_not-a-real-key"})
    assert res.status_code == 401


async def test_me_accepts_a_valid_api_key(client, db_session, seeded_user):
    import hashlib
    import uuid

    from app.models import ApiKey

    user, _session_token = seeded_user
    raw_key = "wt_" + uuid.uuid4().hex
    db_session.add(
        ApiKey(
            id=str(uuid.uuid4()),
            keyHash=hashlib.sha256(raw_key.encode("utf-8")).hexdigest(),
            userId=user.id,
        )
    )
    await db_session.commit()

    res = await client.get("/me", headers={"Authorization": f"Bearer {raw_key}"})
    assert res.status_code == 200
    assert res.json()["id"] == user.id


async def test_me_rejects_a_revoked_api_key(client, db_session, seeded_user):
    import hashlib
    import uuid
    from datetime import UTC, datetime

    from app.models import ApiKey

    user, _session_token = seeded_user
    raw_key = "wt_" + uuid.uuid4().hex
    db_session.add(
        ApiKey(
            id=str(uuid.uuid4()),
            keyHash=hashlib.sha256(raw_key.encode("utf-8")).hexdigest(),
            userId=user.id,
            revokedAt=datetime.now(UTC),
        )
    )
    await db_session.commit()

    res = await client.get("/me", headers={"Authorization": f"Bearer {raw_key}"})
    assert res.status_code == 401


async def test_expired_session_is_rejected(client, db_session):
    import uuid
    from datetime import datetime, timedelta

    from app.models import Session as SessionModel
    from app.models import User

    user = User(
        id=str(uuid.uuid4()),
        name="Expired",
        username="expired",
        email="expired@example.com",
        emailVerified=datetime.now(UTC),
        isSuperAdmin=False,
        createdAt=datetime.now(UTC),
    )
    db_session.add(user)
    await db_session.flush()

    token = str(uuid.uuid4())
    db_session.add(
        SessionModel(
            id=str(uuid.uuid4()),
            sessionToken=token,
            userId=user.id,
            expires=datetime.now(UTC) - timedelta(days=1),
        )
    )
    await db_session.commit()

    res = await client.get("/me", cookies={"authjs.session-token": token})
    assert res.status_code == 401

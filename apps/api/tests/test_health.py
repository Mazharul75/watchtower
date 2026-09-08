import pytest

pytestmark = pytest.mark.asyncio


async def test_health_is_always_ok(client):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_readiness_confirms_database_is_reachable(client):
    res = await client.get("/health/ready")
    assert res.status_code == 200
    assert res.json()["database"] == "reachable"

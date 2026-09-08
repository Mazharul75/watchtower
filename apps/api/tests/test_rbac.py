import pytest

pytestmark = pytest.mark.asyncio


async def test_admin_stats_rejects_non_admin(client, seeded_user):
    _, token = seeded_user
    res = await client.get("/admin/stats", cookies={"authjs.session-token": token})
    assert res.status_code == 403


async def test_admin_stats_allows_super_admin(client, seeded_admin):
    _, token = seeded_admin
    res = await client.get("/admin/stats", cookies={"authjs.session-token": token})
    assert res.status_code == 200
    assert "totalUsers" in res.json()


async def test_org_members_visible_to_viewer_role(client, seeded_org_with_viewer):
    org, user, token = seeded_org_with_viewer
    res = await client.get(f"/orgs/{org.id}/members", cookies={"authjs.session-token": token})
    assert res.status_code == 200
    emails = [m["email"] for m in res.json()]
    assert user.email in emails


async def test_org_members_hidden_from_non_member(client, seeded_org_with_viewer, seeded_admin):
    org, _user, _token = seeded_org_with_viewer
    _, admin_token = seeded_admin
    # The admin is a super admin platform-wide, but holds no membership row in
    # THIS organization — org-scoped RBAC must reject them independently of
    # the platform-admin flag, proving the two authorization layers are separate.
    res = await client.get(f"/orgs/{org.id}/members", cookies={"authjs.session-token": admin_token})
    assert res.status_code == 403

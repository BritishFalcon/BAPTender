import os
import sys
import pathlib
import httpx
import pytest
from asgi_lifespan import LifespanManager
import apscheduler.schedulers.asyncio

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))


class DummyRedis:
    async def publish(self, *args, **kwargs):
        pass


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_path/'test.db'}"
    os.environ["REDIS_URL"] = "redis://localhost"
    apscheduler.schedulers.asyncio.AsyncIOScheduler.start = lambda self: None

    from api.core import db as core_db
    core_db.redis_client = DummyRedis()

    from api.realtime import actions as rt_actions
    rt_actions.redis_client = core_db.redis_client
    from api.realtime import scheduler as rt_scheduler
    rt_scheduler.redis_client = core_db.redis_client
    async def _noop(*args, **kwargs):
        pass
    rt_scheduler.update_archival = _noop

    from api.index import app

    await core_db.create_db_and_tables()

    transport = httpx.ASGITransport(app=app)
    async with LifespanManager(app):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


def _register(ac, user):
    return ac.post("/auth/register", json=user)


def _login(ac, email, password):
    return ac.post("/auth/jwt/login", data={"username": email, "password": password})


@pytest.mark.anyio
async def test_auth_and_flows(client):
    user1 = {
        "email": "owner@example.com",
        "password": "secret",
        "display_name": "owner",
        "weight": 70,
        "gender": "male",
        "height": 170,
        "dob": "1990-01-01",
        "real_dob": True,
    }
    user2 = {
        "email": "member@example.com",
        "password": "secret",
        "display_name": "member",
        "weight": 80,
        "gender": "female",
        "height": 165,
        "dob": "1992-02-02",
        "real_dob": True,
    }

    r = await _register(client, user1)
    assert r.status_code == 201
    r = await _register(client, user2)
    assert r.status_code == 201

    token1 = (await _login(client, user1["email"], user1["password"])).json()["access_token"]
    token2 = (await _login(client, user2["email"], user2["password"])).json()["access_token"]

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    r = await client.get("/auth/authenticated-route", headers=headers1)
    assert r.status_code == 200
    assert "Hello" in r.json()["message"]

    r = await client.post("/group/create", json={"name": "testgroup", "public": True}, headers=headers1)
    assert r.status_code == 200
    group_id = r.json()["id"]

    r = await client.post(f"/group/join/{group_id}", headers=headers2)
    assert r.status_code == 200

    drink = {
        "nickname": "beer",
        "volume": 500,
        "strength": 0.05,
        "add_time": "2025-01-01T00:00:00Z",
    }
    r = await client.post("/drinks", json=drink, headers=headers2)
    assert r.status_code == 200

    r = await client.get("/drinks/mine", headers=headers2)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.delete("/drinks/last", headers=headers2)
    assert r.status_code == 200

    r = await client.get("/drinks/mine", headers=headers2)
    assert len(r.json()) == 0

    r = await client.post(f"/group/leave/{group_id}", headers=headers2)
    assert r.status_code == 200

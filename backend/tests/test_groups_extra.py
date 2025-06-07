import sys
import pathlib
import uuid
import pytest
from .test_api import _register, _login, client as client

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))


@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_group_endpoints(client):
    owner = {
        "email": "owner2@example.com",
        "password": "secret",
        "display_name": "owner2",
        "weight": 75,
        "gender": "male",
        "height": 170,
        "dob": "1990-01-01",
        "real_dob": True,
    }
    owner_pub = {
        "email": "ownerpub@example.com",
        "password": "secret",
        "display_name": "ownerpub",
        "weight": 72,
        "gender": "male",
        "height": 180,
        "dob": "1985-05-05",
        "real_dob": True,
    }
    member = {
        "email": "member2@example.com",
        "password": "secret",
        "display_name": "member2",
        "weight": 65,
        "gender": "female",
        "height": 165,
        "dob": "1992-02-02",
        "real_dob": True,
    }

    assert (await _register(client, owner)).status_code == 201
    assert (await _register(client, owner_pub)).status_code == 201
    assert (await _register(client, member)).status_code == 201

    owner_token = (await _login(client, owner["email"], owner["password"])).json()["access_token"]
    pub_owner_token = (await _login(client, owner_pub["email"], owner_pub["password"])).json()["access_token"]
    member_token = (await _login(client, member["email"], member["password"])).json()["access_token"]

    h_owner = {"Authorization": f"Bearer {owner_token}"}
    h_pub_owner = {"Authorization": f"Bearer {pub_owner_token}"}
    h_member = {"Authorization": f"Bearer {member_token}"}

    # owner creates a private group
    r = await client.post("/group/create", json={"name": f"priv-{uuid.uuid4()}", "public": False}, headers=h_owner)
    assert r.status_code == 200
    priv_id = r.json()["id"]

    # another owner creates a public group
    r = await client.post("/group/create", json={"name": f"pub-{uuid.uuid4()}", "public": True}, headers=h_pub_owner)
    assert r.status_code == 200
    pub_id = r.json()["id"]

    # member joins public group directly
    r = await client.post(f"/group/join/{pub_id}", headers=h_member)
    assert r.status_code == 200
    # leave public group to allow joining another
    await client.post(f"/group/leave/{pub_id}", headers=h_member)

    # attempt to join private group without invite should fail
    r = await client.post(f"/group/join/{priv_id}", headers=h_member)
    assert r.status_code == 400

    # generate invite link for private group and join via token
    invite = await client.get(f"/group/invite-link/{priv_id}", headers=h_owner)
    token = invite.json()["invite_token"]
    r = await client.get(f"/group/invite/{token}", headers=h_member)
    assert r.status_code == 200

    # member should now be active in private group
    r = await client.get("/group/current", headers=h_member)
    assert r.status_code == 200
    assert r.json()["id"] == priv_id


    # go solo
    r = await client.post("/group/switch", headers=h_member)
    assert r.status_code == 200
    assert r.json() is None

    # verify no current group
    r = await client.get("/group/current", headers=h_member)
    assert r.json() is None

    # list my groups should include the private group
    r = await client.get("/group/my", headers=h_member)
    ids = {g["id"] for g in r.json()}
    assert priv_id in ids

    # list public groups should show the public one
    r = await client.get("/group/public")
    assert any(g["id"] == pub_id for g in r.json())

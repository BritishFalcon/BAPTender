import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from uuid import UUID
from typing import Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from api.auth.auth import ALGORITHM, SECRET
from api.drinks.models import Drink
from api.group.models import UserGroup
from api.auth.models import User
from api.core.db import get_async_session
from api.group.models import Group
from api.realtime.calculations import drinks_to_bac
from api.realtime.utils import get_active_group_ws, get_user_ws

import jwt

router = APIRouter()

# In-memory store: group_id -> { user_id -> WebSocket }
group_connections: Dict[Optional[UUID], Dict[UUID, WebSocket]] = {}


async def generate_initial_state(user: User, group: Group | None):
    async for session in get_async_session():
        # Determine relevant users
        if group is None or group.name is None:
            relevant_users = [user]
            active_user_ids = [user.id]
        else:
            result = await session.execute(
                select(UserGroup)
                .options(joinedload(UserGroup.user))
                .where(UserGroup.group_id == group.id)
            )
            user_groups = result.scalars().all()

            relevant_users = [ug.user for ug in user_groups]
            active_user_ids = [ug.user_id for ug in user_groups if ug.active]

        # Fetch drinks
        result = await session.execute(
            select(Drink).where(Drink.user_id.in_(active_user_ids))
        )
        drinks = result.scalars().all()

        # Group drinks per user
        drinks_by_user: dict[str, list[dict]] = {}
        for d in drinks:
            entry = {
                "id": str(d.id),
                "nickname": d.nickname,
                "volume": d.volume,
                "strength": d.strength,
                "time": d.add_time,
            }
            drinks_by_user.setdefault(str(d.user_id), []).append(entry)

        # Members list
        members = []
        for u in relevant_users:
            members.append({
                "id": str(u.id),
                "display_name": u.display_name,
                "is_owner": (group and group.owner_id == u.id) if group else False,
                "active": u.id in active_user_ids,
            })

        # States per user
        states = {}
        for u in relevant_users:
            if u.id not in active_user_ids:
                continue  # Skip inactive

            age = (datetime.now(timezone.utc).date() - user.dob).days / 365
            user_data = {
                "weight": u.weight,
                "gender": u.gender,
                "height": u.height,
                "age": age,
            }

            u_drinks = [
                {
                    "id": d["id"],
                    "nickname": d["nickname"],
                    "volume": d["volume"],
                    "strength": d["strength"],
                    "time": d["time"],
                }
                for d in drinks_by_user.get(str(u.id), [])
            ]

            states[str(u.id)] = drinks_to_bac(u_drinks, user_data)

        return {
            "type": "init",
            "self": {
                "id": str(user.id),
                "display_name": user.display_name,
                "is_owner": (group and user.id == group.owner_id) if group else False,
                "email": user.email,
                "weight": user.weight,
                "gender": user.gender,
                "height": user.height,
                "dob": user.dob,
                "real_dob": user.real_dob,
            },
            "group": {
                "id": str(group.id) if group else None,
                "name": group.name if group else None,
                "public": group.public if group else False,
            },
            "members": members,
            "drinks": drinks_by_user,  # grouped by user_id
            "states": states,          # grouped by user_id
        }


import json
import logging
from datetime import datetime, timezone

async def update_user(user: User, group: Group):
    print("Updating user")

    # Start async session to query the database
    async for session in get_async_session():
        if not getattr(group, "id", None):
            active_users = [user]
        else:
            result = await session.execute(
                select(UserGroup)
                .options(joinedload(UserGroup.user))
                .where(UserGroup.group_id == group.id)
            )
            user_groups = result.scalars().all()
            active_users = [ug.user for ug in user_groups if ug.active]

        # Collect OP's drinks
        result = await session.execute(
            select(Drink).where(Drink.user_id == user.id)
        )
        drinks = result.scalars().all()

        format_drinks = []
        for d in drinks:
            entry = {
                "id": str(d.id),
                "nickname": d.nickname,
                "volume": d.volume,
                "strength": d.strength,
                "time": d.add_time,
            }
            format_drinks.append(entry)

        member_data = {
            "id": str(user.id),
            "display_name": user.display_name,
            "is_owner": (group and group.owner_id == user.id) if group else False,
            "active": True,
        }

        age = (datetime.now(timezone.utc).date() - user.dob).days / 365
        user_data = {
            "weight": user.weight,
            "gender": user.gender,
            "height": user.height,
            "age": age,
        }

        states = drinks_to_bac(format_drinks, user_data)

        update = {
            "type": "update",
            "user": str(user.id),
            "member": member_data,
            "drinks": format_drinks,
            "states": states,
        }

        # Loop through active users and try to send updates
        for u in active_users:
            group_id = group.id if group else None
            if u.id in group_connections.get(group_id, {}):
                try:
                    await group_connections[group_id][u.id].send_text(json.dumps(update, default=str))
                except RuntimeError as e:
                    # Log the error (closed connection) and clean up
                    logging.warning(f"WebSocket for user {u.id} is closed: {e}")
                    # Remove the closed connection from the group_connections
                    del group_connections[group_id][u.id]


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = jwt.decode(token.encode("utf-8"), SECRET, algorithms=[ALGORITHM], audience="fastapi-users:auth")
    user_id = payload.get("sub")

    try:
        user = await get_user_ws(user_id)
        group = await get_active_group_ws(user_id)
    except Exception as e:
        print(e)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    if group:
        if group.id not in group_connections:
            group_connections[group.id] = {}
        group_connections[group.id][user.id] = websocket
    else:
        if None not in group_connections:
            group_connections[None] = {}
        group_connections[None][user.id] = websocket

    # Send initial state
    state = await generate_initial_state(user, group)
    await websocket.send_text(json.dumps(state, default=str))

    try:
        while True:
            data = await websocket.receive_json()
            await websocket.send_text(f"Message text was: {data}")

    except WebSocketDisconnect:
        if group:
            if group.id in group_connections and user.id in group_connections[group.id]:
                del group_connections[group.id][user.id]

            if group in group_connections and not group_connections[group.id]:
                del group_connections[group.id]
        else:
            if None in group_connections and user.id in group_connections[None]:
                del group_connections[None][user.id]

            if None in group_connections and not group_connections[None]:
                del group_connections[None]

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

        # Members list TODO: Change this to a dict
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


async def push_update(user_id: UUID):
    async for session in get_async_session():
        # Fetch the user's group
        result = await session.execute(
            select(UserGroup).where(
                (UserGroup.user_id == user_id) & (UserGroup.active == True)
            )
        )
        user_group = result.scalars().one_or_none()

        if not user_group:
            return

        # Fetch drinks
        result = await session.execute(
            select(Drink).where(Drink.user_id == user_id)
        )
        drinks = result.scalars().all()

        # Format drinks
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

        # Prepare update
        update = {
            "type": "update",
            "user": str(user_id),
            "drinks": format_drinks,
        }

        # Send update to all users in the active group
        group_id = user_group.group_id
        if group_id in group_connections:
            for ws in group_connections[group_id].values():
                try:
                    await ws.send_text(json.dumps(update, default=str))
                except RuntimeError as e:
                    logging.warning(f"WebSocket for user {user_id} is closed: {e}")
                    del group_connections[group_id][user_id]


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
    user_id_from_token = None  # Initialize

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        payload = jwt.decode(token.encode("utf-8"), SECRET, algorithms=[ALGORITHM], audience="fastapi-users:auth")
        user_id_from_token = payload.get("sub")  # Keep this as user_id_from_token

        user = await get_user_ws(user_id_from_token)  # Use the decoded ID
        if not user:  # User not found in DB
            print(f"WebSocket Auth Error: User {user_id_from_token} not found in DB.")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        group = await get_active_group_ws(user.id)  # Pass user.id (UUID)

    except jwt.PyJWTError as e:  # Catch JWT errors (expired, invalid, etc.)
        print(f"WebSocket JWT Error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    except Exception as e:  # Catch other exceptions during user/group fetch
        print(f"WebSocket Setup Error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # If we've reached here, user and group (if any) are fetched.
    # Store user.id (which is a UUID) not user_id_from_token (which is a string from JWT sub)
    # if you intend to use user.id as the key in group_connections.
    # For simplicity, let's use user.id as it's consistently a UUID.
    current_user_id = user.id

    active_group_id = group.id if group else None  # Use a consistent key for the group_connections

    if active_group_id not in group_connections:
        group_connections[active_group_id] = {}
    group_connections[active_group_id][current_user_id] = websocket
    print(f"User {current_user_id} connected to group {active_group_id}.")

    try:
        # Send initial state
        state = await generate_initial_state(user, group)
        print(f"Attempting to send initial state to {current_user_id} in group {active_group_id}...")
        await websocket.send_text(json.dumps(state, default=str))
        print(f"Initial state sent to {current_user_id}.")

        # Main loop for receiving messages (if your app needs bi-directional)
        # If it's mostly server-to-client, this loop might just await client messages or pings.
        while True:
            # This part depends on whether you expect messages from the client
            # If not, you might just have a `await asyncio.sleep(1)` or similar to keep alive
            # or handle pings. For now, let's assume it might receive data.
            try:
                data = await websocket.receive_text()  # Or receive_json()
                print(f"Received from {current_user_id}: {data}")
                # Example: Echo back or process data
                # await websocket.send_text(f"Server received: {data}")
            except WebSocketDisconnect:  # This catches disconnects during receive_text/json
                print(f"WebSocketDisconnect caught during receive for user {current_user_id}.")
                break  # Exit the while loop to proceed to cleanup
            except Exception as e_loop:  # Catch other errors inside the loop
                print(f"Error in WebSocket loop for user {current_user_id}: {e_loop}")
                break  # Exit loop on other errors too

    except WebSocketDisconnect:  # Catches disconnects specifically (e.g., if send_text above failed)
        print(
            f"WebSocketDisconnect caught for user {current_user_id} (likely during initial send or if loop broke cleanly).")
    except Exception as e_outer:  # Catch any other unexpected errors
        print(f"Outer exception for user {current_user_id}: {e_outer}")
        # Try to close gracefully if possible, though connection might already be dead
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass  # Ignore errors during this close attempt
    finally:
        # Cleanup logic (this will run if the try block completes or if an exception caused an exit)
        print(f"Cleaning up connection for user {current_user_id} from group {active_group_id}.")
        if active_group_id in group_connections and current_user_id in group_connections[active_group_id]:
            del group_connections[active_group_id][current_user_id]
            if not group_connections[active_group_id]:  # If group is now empty
                del group_connections[active_group_id]
        print(f"User {current_user_id} fully disconnected.")
import json
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from uuid import UUID
from typing import Dict, Optional, List

from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

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


async def generate_initial_state(user: User, group: Optional[Group]):
    async for session in get_async_session():
        relevant_user_objects: List[User] = []
        user_ids_in_current_context: List[UUID] = []  # IDs of users relevant to the current context (group or solo)

        if group is None:  # User is solo
            relevant_user_objects = [user]
            user_ids_in_current_context = [user.id]
        else:  # User is in a group
            user_group_entries = await session.execute(
                select(UserGroup)
                .options(
                    selectinload(UserGroup.user)  # Eager load the full User object
                )
                .where(UserGroup.group_id == group.id)
            )
            # Filter out entries where ug.user might be None if DB relationship is nullable (though typically not for FK)
            relevant_user_objects = [ug.user for ug in user_group_entries.scalars().unique().all() if ug.user]
            user_ids_in_current_context = [u.id for u in relevant_user_objects]

        all_drinks_list: List[Drink] = []
        if user_ids_in_current_context:  # Only fetch if there are users
            all_drinks_result = await session.execute(
                select(Drink)
                .where(Drink.user_id.in_(user_ids_in_current_context))
                .order_by(Drink.add_time.asc())
            )
            all_drinks_list = all_drinks_result.scalars().all()

        drinks_by_user: Dict[str, List[Dict]] = {}
        for d_drink in all_drinks_list:
            entry = {
                "id": str(d_drink.id),
                "nickname": d_drink.nickname,
                "volume": d_drink.volume,
                "strength": d_drink.strength,
                "time": d_drink.add_time,  # This is a datetime object
            }
            drinks_by_user.setdefault(str(d_drink.user_id), []).append(entry)

        members_list_for_ws: List[Dict] = []
        for u_member in relevant_user_objects:
            # Ensure all fields for UserType (matching frontend) are present with snake_case keys
            members_list_for_ws.append({
                "id": str(u_member.id),
                "displayName": u_member.display_name,  # snake_case
                "email": u_member.email,
                "weight": u_member.weight,
                "gender": u_member.gender,
                "height": u_member.height,
                "dob": u_member.dob.isoformat() if u_member.dob else None,  # snake_case
                "realDob": u_member.real_dob,  # snake_case
                "isOwner": (group and group.owner_id == u_member.id) if group else (u_member.id == user.id),
                # snake_case
                "active": True,  # Assuming 'active' means present in this group context for the message
            })

        states_by_user: Dict[str, List[Dict]] = {}
        for u_member in relevant_user_objects:
            # Ensure u_member has necessary attributes for BAC calculation
            if not all([hasattr(u_member, attr) for attr in ['dob', 'weight', 'gender']]):
                # logging.warning(f"User {u_member.id} missing attributes for BAC calc in init, skipping states.")
                states_by_user[str(u_member.id)] = []
                continue

            age_in_days = (datetime.now(timezone.utc).date() - u_member.dob).days
            age_in_years = age_in_days / 365.25

            user_data_for_bac = {
                "weight": u_member.weight,
                "gender": u_member.gender,
                "height": u_member.height,  # Can be None
                "age": age_in_years,
            }
            # Ensure drinks have datetime objects for 'time' key for drinks_to_bac
            member_drinks_for_bac_calc = drinks_by_user.get(str(u_member.id), [])
            states_by_user[str(u_member.id)] = drinks_to_bac(member_drinks_for_bac_calc, user_data_for_bac)

        self_profile_data = next((m for m in members_list_for_ws if m["id"] == str(user.id)), None)
        if not self_profile_data:
            self_profile_data = {  # Fallback for truly solo user not in any group structure yet
                "id": str(user.id), "displayName": user.display_name, "email": user.email,
                "weight": user.weight, "gender": user.gender, "height": user.height,
                "dob": user.dob.isoformat() if user.dob else None, "realDob": user.real_dob,
                "isOwner": True, "active": True,
            }

        return {
            "type": "init",
            "self": self_profile_data,
            "group": {
                "id": str(group.id) if group else None,
                "name": group.name if group else None,
                "public": group.public if group else False,
            } if group else None,  # Send group as null if not in a group
            "members": members_list_for_ws,
            "drinks": drinks_by_user,
            "states": states_by_user,
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


async def update_user(user: User, group: Optional[Group]):
    # The 'user' object passed here IS the already updated user instance from the database
    print(f"WebSocket: Preparing update for user {user.id} due to profile/drink change.")

    async for session in get_async_session():
        # 1. Prepare the comprehensive updated user profile using snake_case keys
        profile_data_for_ws = {
            "id": str(user.id),
            "displayName": user.display_name,
            "email": user.email,
            "weight": user.weight,
            "gender": user.gender,
            "height": user.height,
            "dob": user.dob.isoformat() if user.dob else None,
            "realDob": user.real_dob,
            "isOwner": (group and group.owner_id == user.id) if group else False,
            "active": True,  # User whose data is being updated is considered active in this context
        }

        # 2. Fetch user's current drinks
        drinks_result = await session.execute(
            select(Drink).where(Drink.user_id == user.id).order_by(Drink.add_time.asc())
        )
        user_drinks_list = drinks_result.scalars().all()

        format_drinks_for_ws = []
        for d_drink in user_drinks_list:
            entry = {
                "id": str(d_drink.id), "nickname": d_drink.nickname, "volume": d_drink.volume,
                "strength": d_drink.strength, "time": d_drink.add_time,  # datetime object
            }
            format_drinks_for_ws.append(entry)

        # 3. Recalculate BAC states for the updated user
        # Ensure 'user' object has necessary attributes
        if not all([hasattr(user, attr) for attr in ['dob', 'weight', 'gender']]):
            # logging.error(f"User {user.id} missing attributes for BAC calc in update_user, sending empty states.")
            calculated_states_for_ws = []
        else:
            age_in_days = (datetime.now(timezone.utc).date() - user.dob).days
            age_in_years = age_in_days / 365.25
            user_data_for_bac = {
                "weight": user.weight, "gender": user.gender,
                "height": user.height, "age": age_in_years,
            }
            calculated_states_for_ws = drinks_to_bac(format_drinks_for_ws, user_data_for_bac)

        # 4. Construct the final WebSocket update message
        update_message = {
            "type": "update",
            "user_id_updated": str(user.id),  # ID of the user whose data changed
            "profile": profile_data_for_ws,  # Their comprehensive updated profile (snake_case keys)
            "drinks": format_drinks_for_ws,  # Their latest drinks list
            "states": calculated_states_for_ws,  # Their latest BAC states
        }

        # 5. Determine broadcast list
        target_connections: Dict[UUID, WebSocket] = {}
        # If in a group, broadcast to all group members.
        # If solo, this update is primarily for themselves if they have a solo connection.
        # The original logic for `update_user` fetched active_users based on the group passed.
        # We'll replicate that to determine who to send to.

        users_to_notify: List[User] = []
        group_id_for_lookup = group.id if group else None

        if group:  # If the updated user was associated with a group for this update context
            user_group_entries = await session.execute(
                select(UserGroup).options(selectinload(UserGroup.user))
                .where(UserGroup.group_id == group.id)
                # .where(UserGroup.group_id == group.id, UserGroup.active == True) # Or only to active members
            )
            # users_to_notify = [ug.user for ug in user_group_entries.scalars().unique().all() if ug.user]
            # For profile updates, all members of the group should get it to update their member list
            temp_users_to_notify = [ug.user for ug in user_group_entries.scalars().unique().all() if ug.user]
            if user not in temp_users_to_notify:  # ensure the user themselves is in the list if they are in the group
                users_to_notify = temp_users_to_notify + [user]
                users_to_notify = list(set(users_to_notify))  # make unique
            else:
                users_to_notify = temp_users_to_notify

        else:  # User is solo, notification primarily for themselves
            users_to_notify = [user]
            group_id_for_lookup = None  # For solo connections stored under None key

        print(
            f"WebSocket: Broadcasting update for user {user.id} to {len(users_to_notify)} potential user(s) in context of group {group_id_for_lookup}.")

        active_connections_in_context = group_connections.get(group_id_for_lookup, {})

        for target_user in users_to_notify:
            if target_user.id in active_connections_in_context:
                websocket_conn = active_connections_in_context[target_user.id]
                try:
                    await websocket_conn.send_text(json.dumps(update_message, default=str))
                    print(f"WebSocket: Sent update (for user {user.id}) to user {target_user.id}")
                except (RuntimeError, WebSocketDisconnect) as e:
                    logging.warning(f"WebSocket for user {target_user.id} is closed or errored: {e}. Cleaning up.")
                    del active_connections_in_context[target_user.id]  # Remove from the specific group/solo dict
                    if not active_connections_in_context:  # If the group dict is now empty
                        if group_id_for_lookup in group_connections:
                            del group_connections[group_id_for_lookup]
                except Exception as e_general:
                    logging.error(f"WebSocket: Unexpected error sending to {target_user.id}: {e_general}")


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
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.auth.auth import ALGORITHM, SECRET
from api.auth.models import User
from api.core.db import get_async_session
from api.drinks.models import Drink
from api.group.models import Group, UserGroup
from api.realtime.calculations import drinks_to_bac
from api.realtime.sse_manager import broadcaster
from api.realtime.utils import get_active_group_ws, get_user_ws
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
import jwt

router = APIRouter()


async def generate_initial_state(user: User, group: Optional[Group]):
    async for session in get_async_session():
        relevant_user_objects: List[User] = []
        user_ids_in_current_context: List[UUID] = []

        if group is None:
            relevant_user_objects = [user]
            user_ids_in_current_context = [user.id]
        else:
            user_group_entries = await session.execute(
                select(UserGroup)
                .options(selectinload(UserGroup.user))
                .where(UserGroup.group_id == group.id)
            )
            relevant_user_objects = [ug.user for ug in user_group_entries.scalars().unique().all() if ug.user]
            user_ids_in_current_context = [u.id for u in relevant_user_objects]

        all_drinks_list: List[Drink] = []
        if user_ids_in_current_context:
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
                "time": d_drink.add_time,
            }
            drinks_by_user.setdefault(str(d_drink.user_id), []).append(entry)

        members_list_for_ws: List[Dict] = []
        for u_member in relevant_user_objects:
            members_list_for_ws.append({
                "id": str(u_member.id),
                "displayName": u_member.display_name,
                "email": u_member.email,
                "weight": u_member.weight,
                "gender": u_member.gender,
                "height": u_member.height,
                "dob": u_member.dob.isoformat() if u_member.dob else None,
                "realDob": u_member.real_dob,
                "isOwner": (group and group.owner_id == u_member.id) if group else (u_member.id == user.id),
                "active": True,
            })

        states_by_user: Dict[str, List[Dict]] = {}
        for u_member in relevant_user_objects:
            if not all([hasattr(u_member, attr) for attr in ['dob', 'weight', 'gender']]):
                states_by_user[str(u_member.id)] = []
                continue

            age_in_days = (datetime.now(timezone.utc).date() - u_member.dob).days
            age_in_years = age_in_days / 365.25
            user_data_for_bac = {
                "weight": u_member.weight,
                "gender": u_member.gender,
                "height": u_member.height,
                "age": age_in_years,
            }
            member_drinks_for_bac_calc = drinks_by_user.get(str(u_member.id), [])
            states_by_user[str(u_member.id)] = drinks_to_bac(member_drinks_for_bac_calc, user_data_for_bac)

        self_profile_data = next((m for m in members_list_for_ws if m["id"] == str(user.id)), None)
        if not self_profile_data:
            self_profile_data = {
                "id": str(user.id),
                "displayName": user.display_name,
                "email": user.email,
                "weight": user.weight,
                "gender": user.gender,
                "height": user.height,
                "dob": user.dob.isoformat() if user.dob else None,
                "realDob": user.real_dob,
                "isOwner": True,
                "active": True,
            }

        return {
            "type": "init",
            "self": self_profile_data,
            "group": {
                "id": str(group.id) if group else None,
                "name": group.name if group else None,
                "public": group.public if group else False,
            } if group else None,
            "members": members_list_for_ws,
            "drinks": drinks_by_user,
            "states": states_by_user,
        }


async def broadcast_user_update(user: User, group: Optional[Group]):
    logging.info("Preparing SSE update for user %s", user.id)
    async for session in get_async_session():
        profile_data = {
            "id": str(user.id),
            "displayName": user.display_name,
            "email": user.email,
            "weight": user.weight,
            "gender": user.gender,
            "height": user.height,
            "dob": user.dob.isoformat() if user.dob else None,
            "realDob": user.real_dob,
            "isOwner": (group and group.owner_id == user.id) if group else False,
            "active": True,
        }

        drinks_result = await session.execute(
            select(Drink).where(Drink.user_id == user.id).order_by(Drink.add_time.asc())
        )
        user_drinks_list = drinks_result.scalars().all()
        format_drinks_for_ws = [
            {
                "id": str(d.id),
                "nickname": d.nickname,
                "volume": d.volume,
                "strength": d.strength,
                "time": d.add_time,
            }
            for d in user_drinks_list
        ]

        if not all([hasattr(user, attr) for attr in ['dob', 'weight', 'gender']]):
            calculated_states_for_ws = []
        else:
            age_in_days = (datetime.now(timezone.utc).date() - user.dob).days
            age_in_years = age_in_days / 365.25
            user_data_for_bac = {
                "weight": user.weight,
                "gender": user.gender,
                "height": user.height,
                "age": age_in_years,
            }
            calculated_states_for_ws = drinks_to_bac(format_drinks_for_ws, user_data_for_bac)

        update_message = {
            "type": "update",
            "user_id_updated": str(user.id),
            "profile": profile_data,
            "drinks": format_drinks_for_ws,
            "states": calculated_states_for_ws,
        }

        group_id_for_lookup = group.id if group else None
        await broadcaster.broadcast(group_id_for_lookup, update_message)


@router.get("/state")
async def get_state(request: Request):
    token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    try:
        payload = jwt.decode(token.encode("utf-8"), SECRET, algorithms=[ALGORITHM], audience="fastapi-users:auth")
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Invalid token")

    user = await get_user_ws(user_id)
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    group = await get_active_group_ws(user.id)
    state = await generate_initial_state(user, group)
    return state


@router.get("/events")
async def sse_endpoint(request: Request):
    token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    try:
        payload = jwt.decode(token.encode("utf-8"), SECRET, algorithms=[ALGORITHM], audience="fastapi-users:auth")
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Invalid token")

    user = await get_user_ws(user_id)
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    group = await get_active_group_ws(user.id)
    group_id = group.id if group else None
    queue = broadcaster.add_client(group_id, user.id)
    init_state = await generate_initial_state(user, group)
    initial_event = ServerSentEvent(data=json.dumps(init_state, default=str))

    async def event_generator():
        yield initial_event
        try:
            while True:
                if await request.is_disconnected():
                    break
                event = await queue.get()
                yield event
        finally:
            broadcaster.remove_client(group_id, user.id)

    return EventSourceResponse(event_generator())


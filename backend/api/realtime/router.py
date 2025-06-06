import json
import asyncio
import jwt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from uuid import UUID
from typing import Dict, Optional, List
from sse_starlette.sse import EventSourceResponse

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.auth.auth import ALGORITHM, SECRET
from api.auth.users import UserManager
from api.auth.deps import get_user_manager, current_active_user
from api.drinks.models import Drink
from api.group.models import UserGroup, Group
from api.auth.models import User
from api.core.db import get_async_session, redis_client
from api.group.deps import get_active_group
from api.realtime.calculations import drinks_to_bac

router = APIRouter()


async def get_user_for_sse(
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
) -> User:
    """Dependency to authenticate a user for SSE via a URL query token."""
    token = request.query_params.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing token",
        )
    try:
        data = jwt.decode(
            token,
            SECRET,
            algorithms=[ALGORITHM],
            audience="fastapi-users:auth",
        )
        user_id = data.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
            )
        user = await user_manager.get(user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        return user
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@router.get("/stream/{user_id}")
async def sse_stream(
    user_id: UUID,
    request: Request,
    auth_user: User = Depends(get_user_for_sse)
):
    """Establishes a Server-Sent Events connection for a user."""
    if user_id != auth_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this stream.",
        )

    channel_name = f"sse:{auth_user.id}"

    async def event_generator():
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(channel_name)
        print(f"SSE stream SUBSCRIBED to Redis channel: {channel_name}")
        try:
            while True:
                if await request.is_disconnected():
                    print(f"SSE client DISCONNECTED from channel: {channel_name}")
                    break
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                if message:
                    print(f"REDIS MESSAGE RECEIVED on backend for channel {channel_name}. Yielding to client.")
                    # MODIFICATION: Send a default, unnamed event.
                    yield {"data": message["data"]}
                await asyncio.sleep(0.01)
        finally:
            print(f"SSE stream CLOSING for channel: {channel_name}")
            await pubsub.unsubscribe(channel_name)

    return EventSourceResponse(event_generator())


@router.get("/initial-state")
async def get_initial_state(
    user: User = Depends(current_active_user),
    group: Optional[Group] = Depends(get_active_group)
):
    """Fetches the complete initial state for a user upon login."""
    async for session in get_async_session():
        relevant_user_objects: List[User] = []
        user_ids_in_context: List[UUID] = []

        if group is None:
            relevant_user_objects = [user]
            user_ids_in_context = [user.id]
        else:
            user_group_entries = await session.execute(
                select(UserGroup)
                .options(selectinload(UserGroup.user))
                .where(UserGroup.group_id == group.id)
            )
            relevant_user_objects = [ug.user for ug in user_group_entries.scalars().unique().all() if ug.user]
            user_ids_in_context = [u.id for u in relevant_user_objects]

        all_drinks_list: List[Drink] = []
        if user_ids_in_context:
            all_drinks_result = await session.execute(
                select(Drink)
                .where(Drink.user_id.in_(user_ids_in_context))
                .order_by(Drink.add_time.asc())
            )
            all_drinks_list = all_drinks_result.scalars().all()

        drinks_by_user = {}
        for d in all_drinks_list:
            drinks_by_user.setdefault(str(d.user_id), []).append({
                "id": str(d.id), "nickname": d.nickname, "volume": d.volume,
                "strength": d.strength, "time": d.add_time
            })

        members_list = []
        for u in relevant_user_objects:
            members_list.append({
                "id": str(u.id), "displayName": u.display_name, "email": u.email,
                "weight": u.weight, "gender": u.gender, "height": u.height,
                "dob": u.dob.isoformat() if u.dob else None, "realDob": u.real_dob,
                "isOwner": (group and group.owner_id == u.id) if group else (u.id == user.id),
                "active": True,
            })

        states_by_user = {}
        for u in relevant_user_objects:
            age = (datetime.now(timezone.utc).date() - u.dob).days / 365.25
            user_data = {"weight": u.weight, "gender": u.gender, "height": u.height, "age": age}
            member_drinks = drinks_by_user.get(str(u.id), [])
            states_by_user[str(u.id)] = drinks_to_bac(member_drinks, user_data)

        self_profile = next((m for m in members_list if m["id"] == str(user.id)), None)

        return {
            "type": "init", "self": self_profile,
            "group": {"id": str(group.id), "name": group.name, "public": group.public} if group else None,
            "members": members_list, "drinks": drinks_by_user, "states": states_by_user,
        }
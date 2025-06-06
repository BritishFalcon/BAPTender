import json
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.auth.models import User
from api.core.db import redis_client, get_async_session
from api.drinks.models import Drink
from api.group.models import Group, UserGroup
from api.realtime.calculations import drinks_to_bac


async def update_user(user: User, group: Optional[Group]):
    """
    Constructs a comprehensive update package and publishes it to the Redis
    channel of every user affected by the change (e.g., all members of a group).
    """
    async for session in get_async_session():

        profile_data = {
            "id": str(user.id), "displayName": user.display_name, "email": user.email,
            "weight": user.weight, "gender": user.gender, "height": user.height,
            "dob": user.dob.isoformat() if user.dob else None, "realDob": user.real_dob,
            "isOwner": (group and group.owner_id == user.id) if group else False, "active": True,
        }

        drinks_result = await session.execute(
            select(Drink).where(Drink.user_id == user.id).order_by(Drink.add_time.asc())
        )
        user_drinks = drinks_result.scalars().all()
        formatted_drinks = [
            {"id": str(d.id), "nickname": d.nickname, "volume": d.volume,
             "strength": d.strength, "time": d.add_time} for d in user_drinks
        ]

        age = (datetime.now(timezone.utc).date() - user.dob).days / 365.25
        user_data_for_bac = {"weight": user.weight, "gender": user.gender, "height": user.height, "age": age}
        calculated_states = drinks_to_bac(formatted_drinks, user_data_for_bac)

        update_message = {
            "type": "update", "user_id_updated": str(user.id),
            "profile": profile_data, "drinks": formatted_drinks, "states": calculated_states,
        }

        users_to_notify_ids = []
        if group:
            user_group_entries = await session.execute(
                select(UserGroup.user_id).where(
                    UserGroup.group_id == group.id,
                    UserGroup.active == True
                )
            )
            users_to_notify_ids = user_group_entries.scalars().unique().all()
        else:
            # If the user is solo, only notify them.
            users_to_notify_ids = [user.id]

        if not users_to_notify_ids:
            print(f"Update for user {user.id} occurred, but no active users found to notify.")
            return

        update_message_json = json.dumps(update_message, default=str)
        for target_user_id in users_to_notify_ids:
            channel = f"sse:{target_user_id}"
            await redis_client.publish(channel, update_message_json)
            print(f"Published update to Redis channel: {channel}")
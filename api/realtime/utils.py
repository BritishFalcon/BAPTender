import logging
from typing import Optional
from api.auth.models import User
from api.core.db import get_async_session
from api.group.models import Group, UserGroup
from sqlalchemy import select


async def get_user_ws(user_id: str) -> Optional[User]:
    async for session in get_async_session():
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user


async def get_active_group_ws(user_id: int) -> Optional[Group]:
    async for session in get_async_session():
        # 1) fetch all active group_ids for this user
        result = await session.execute(
            select(UserGroup.group_id)
            .where(
                UserGroup.user_id == user_id,
                UserGroup.active.is_(True)
            )
        )
        group_ids = result.scalars().all()

        if not group_ids:
            return None

        if len(group_ids) > 1:
            logging.warning(
                "User %s has %d active groups, picking the first: %s",
                user_id,
                len(group_ids),
                group_ids,
            )

        group_id = group_ids[0]

        # 2) fetch the actual Group object
        result = await session.execute(
            select(Group).where(Group.id == group_id)
        )
        return result.scalar_one_or_none()
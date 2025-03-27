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


async def get_active_group_ws(user_id: User) -> Optional[Group]:
    async for session in get_async_session():
        result = await session.execute(
            select(UserGroup.group_id).where(UserGroup.user_id == user_id and UserGroup.active is True)
        )
        group_id = result.scalar_one_or_none()
        if not group_id:
            return

        result = await session.execute(
            select(Group).where(Group.id == group_id)
        )
        group = result.scalar_one_or_none()
        return group

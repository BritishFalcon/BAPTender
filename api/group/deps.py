from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from api.auth.deps import current_active_user
from api.core.db import get_async_session
from api.auth.models import User
from api.group.models import UserGroup
from sqlalchemy.future import select


async def get_active_group(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(UserGroup).where(UserGroup.user_id == user.id, UserGroup.active == True)
    )
    user_group = result.scalars().first()
    if not user_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User has no active group."
        )
    return user_group.group

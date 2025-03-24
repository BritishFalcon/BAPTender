import uuid
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func
from fastapi_users import FastAPIUsers

from api.auth.models import User
from api.auth.users import UserManager
from api.auth.auth import auth_backend
from api.auth.db import get_user_db
from api.core.db import get_async_session


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
optional_user = fastapi_users.current_user(optional=True)


async def update_last_seen_user(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    user.last_seen = func.now()
    session.add(user)
    await session.commit()
    return user

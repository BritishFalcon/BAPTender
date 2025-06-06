# api/auth/users.py
import uuid
from typing import Optional, Dict, Any
from fastapi import Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.auth.auth import SECRET
from api.auth.models import User
from api.core.db import get_async_session
from api.realtime.actions import update_user as trigger_realtime_update
from api.group.models import Group, UserGroup
import asyncio


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def on_after_update(
            self,
            user: User,
            update_dict: Dict[str, Any],
            request: Optional[Request] = None
    ):
        print(f"User {user.id} has been updated. Data changed: {update_dict.keys()}")

        relevant_fields_for_bac = {"weight", "gender", "height", "dob", "display_name"}
        if not relevant_fields_for_bac.isdisjoint(update_dict.keys()):
            print(f"Relevant user details updated for {user.id}, triggering Redis publish.")

            async def do_update_with_session():
                async for session in get_async_session():
                    ug_result = await session.execute(
                        select(UserGroup)
                        .options(selectinload(UserGroup.group))
                        .where(
                            UserGroup.user_id == user.id,
                            UserGroup.active.is_(True),
                        )
                    )
                    user_group = ug_result.scalars().first()
                    active_group = user_group.group if user_group else None
                    await trigger_realtime_update(user, active_group)

            asyncio.create_task(do_update_with_session())
        else:
            print(f"User {user.id} updated, but no BAC-relevant fields changed. Skipping update.")
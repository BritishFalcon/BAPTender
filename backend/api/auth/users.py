# api/auth/users.py
import uuid
from typing import Optional, Dict, Any
from fastapi import Request
from fastapi_users import BaseUserManager, UUIDIDMixin


from api.auth.auth import SECRET
from api.auth.models import User
from api.realtime.actions import update_user as trigger_realtime_update

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

            asyncio.create_task(trigger_realtime_update(user))
        else:
            print(f"User {user.id} updated, but no BAC-relevant fields changed. Skipping update.")
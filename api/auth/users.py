# api/auth/users.py
import uuid
from typing import Optional, Dict, Any  # Added Dict, Any
from fastapi import Depends  # Added Depends

from fastapi import Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from sqlalchemy.ext.asyncio import AsyncSession  # Added for type hinting

from api.auth.auth import SECRET  #
from api.auth.models import User  #
from api.core.db import get_async_session  # To fetch session for group fetching

# Importing here avoids circular dependency issues when the realtime router imports UserManager
from api.realtime.router import broadcast_user_update as trigger_realtime_update  #
from api.realtime.utils import get_active_group_ws  #
import asyncio  # For creating a task


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")
        # You could potentially trigger an initial ws update here too if needed
        # async for session in get_async_session(): # Not standard to get session here this way
        #     active_group = await get_active_group_ws(user.id) # user.id passed directly
        #     asyncio.create_task(trigger_realtime_update(user, active_group))

    async def on_after_forgot_password(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
            self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    # NEW: Hook after user profile is updated via PATCH /users/me
    async def on_after_update(
            self,
            user: User,  # The updated user object from the database
            update_dict: Dict[str, Any],  # The dictionary of data that was updated
            request: Optional[Request] = None
    ):
        print(f"User {user.id} has been updated. Data changed: {update_dict.keys()}")

        # Check if any relevant fields for BAC calculation or display were updated
        relevant_fields_for_bac = {"weight", "gender", "height", "dob", "display_name"}
        if not relevant_fields_for_bac.isdisjoint(update_dict.keys()):
            print(f"Relevant user details updated for {user.id}, triggering WebSocket update.")

            # We need an AsyncSession to fetch the active group.
            # FastAPI Users user_manager methods don't typically have direct access to a session
            # unless it's passed via request state or a dependency if the method supports it.
            # The request object might have state.db if using a middleware.
            # For simplicity, let's try to get a session. This is a bit tricky from here.

            # A cleaner way might be to have the /users/me PATCH endpoint itself (if overridden)
            # or a dependency handle this.
            # For now, let's try to get a session if possible or just update the user for now.

            # The 'user' object here is the updated one. We need their active group.
            # Since we can't easily get a session here without refactoring dependencies,

            # Simplest approach: trigger_realtime_update will need to fetch the group itself.
            # The user object passed is already updated.

            # Let's call a helper that can manage session scoping
            async def do_update_with_session():
                async for session in get_async_session():  # Get a new session
                    # Re-fetch user within this new session to ensure it's attached,
                    # or assume the passed 'user' object can be used if its attributes are loaded.
                    # The user object from on_after_update should be session-bound and updated.
                    active_group = await get_active_group_ws(user.id)  # Pass user.id (UUID)
                    await trigger_realtime_update(user, active_group)

            # Schedule the task to run in the background
            asyncio.create_task(do_update_with_session())
        else:
            print(f"User {user.id} updated, but no BAC-relevant fields changed. Skipping WS update.")
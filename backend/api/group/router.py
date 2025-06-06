import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from api.auth.deps import current_active_user
from api.core.db import get_async_session, HOST_URL
from api.group.models import Group, UserGroup
from api.group.schemas import GroupCreate, GroupRead, GroupMember
from api.group.utils import generate_invite_token, decode_invite_token
from api.auth.models import User

from fastapi import Query

from api.realtime.actions import update_user

router = APIRouter()


@router.post("/create", response_model=GroupRead)
async def create_group(
        group_data: GroupCreate,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    if group_data.name == "global":
        raise HTTPException(status_code=400, detail="Reserved group name")

    existing = await session.execute(select(Group).where(Group.name == group_data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Group name already taken!")

    group = Group(
        name=group_data.name,
        public=group_data.public,
        owner_id=user.id
    )
    session.add(group)
    await session.flush()

    await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id)
        .values(active=False)
        .execution_options(synchronize_session=False)
    )

    user_group = UserGroup(
        user_id=user.id,
        group_id=group.id,
        active=True
    )
    session.add(user_group)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Group name already taken!")

    asyncio.create_task(update_user(user))

    return group


from typing import Optional


@router.post("/switch", response_model=Optional[GroupRead])
async def switch_group(
        group_id: Optional[uuid.UUID] = Query(None),
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id)
        .values(active=False)
        .execution_options(synchronize_session=False)
    )

    group = None
    if group_id is not None:
        result = await session.execute(
            update(UserGroup)
            .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
            .values(active=True)
            .execution_options(synchronize_session=False)
        )

        if result.rowcount == 0:
            await session.rollback()
            raise HTTPException(status_code=404, detail="Group not found or not joined.")

        group_result = await session.execute(select(Group).where(Group.id == group_id))
        group = group_result.scalar_one_or_none()

    await session.commit()
    asyncio.create_task(update_user(user))
    return group


@router.get("/current", response_model=Optional[GroupRead])
async def current_group(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Group)
        .join(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.active == True)
    )
    return result.scalars().first()


@router.get("/my", response_model=list[GroupRead])
async def my_groups(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Group)
        .join(UserGroup)
        .where(UserGroup.user_id == user.id)
    )
    return result.scalars().all()


@router.get("/public", response_model=list[GroupRead])
async def public_groups(
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Group).where(Group.public == True)
    )
    return result.scalars().all()


@router.get("/invite-link/{group_id}")
async def invite_link(
        group_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found or user not a member.")

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group.public:
        raise HTTPException(status_code=400, detail="Group is public. No invite link needed.")

    token = generate_invite_token(group_id)
    return {
        "invite_link": f"{HOST_URL}/invite/{token}",
        "invite_token": token,
    }


@router.post("/join/{group_id}", response_model=GroupRead)
async def join_group_public(
        group_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User is already a member.")

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group does not exist.")
    if not group.public:
        raise HTTPException(status_code=400, detail="Group is private — no join allowed.")

    user_group = UserGroup(user_id=user.id, group_id=group_id, active=True)
    session.add(user_group)
    await session.commit()

    asyncio.create_task(update_user(user))
    return group


@router.get("/invite/{token}", response_model=GroupRead)
async def join_group(
        token: str,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    group_id = decode_invite_token(token)
    if not group_id:
        raise HTTPException(status_code=400, detail="Invalid token.")

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group does not exist.")
    if group.public:
        raise HTTPException(status_code=400, detail="Group is public — no invite needed.")

    result = await session.execute(
        select(UserGroup).where(
            UserGroup.user_id == user.id, UserGroup.group_id == group_id
        )
    )
    existing = result.scalar_one_or_none()

    await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id)
        .values(active=False)
        .execution_options(synchronize_session=False)
    )

    if existing:
        await session.execute(
            update(UserGroup)
            .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
            .values(active=True)
            .execution_options(synchronize_session=False)
        )
    else:
        session.add(UserGroup(user_id=user.id, group_id=group_id, active=True))

    await session.commit()
    asyncio.create_task(update_user(user))
    return group


@router.get("/members/{group_id}", response_model=list[GroupMember])
async def get_group_members(
        group_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(UserGroup)
        .where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Group not found.")

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    result = await session.execute(
        select(UserGroup)
        .options(selectinload(UserGroup.user))
        .where(UserGroup.group_id == group_id)
    )
    user_groups = result.scalars().all()

    return [
        GroupMember(
            id=ug.user.id,
            display_name=ug.user.display_name,
            is_owner=(ug.user.id == group.owner_id),
            active=ug.active
        )
        for ug in user_groups
    ]


@router.post("/leave/{group_id}")
async def leave_group(
        group_id: uuid.UUID,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    user_group = result.scalar_one_or_none()
    if not user_group:
        raise HTTPException(status_code=404, detail="Group not found or user not in group.")

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    if group.owner_id == user.id:
        await session.execute(delete(UserGroup).where(UserGroup.group_id == group_id))
        await session.execute(delete(Group).where(Group.id == group_id))
        await session.commit()
        # No group to update anymore, but we can notify the user they are solo
        asyncio.create_task(update_user(user))
        return {"detail": "Deleted group."}

    await session.delete(user_group)
    await session.commit()

    asyncio.create_task(update_user(user))
    return {"detail": "Left group."}
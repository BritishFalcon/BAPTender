import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from sqlalchemy.exc import IntegrityError

from api.auth.deps import current_active_user
from api.core.db import get_async_session, HOST_URL
from api.group.models import Group, UserGroup
from api.group.schemas import GroupCreate, GroupRead, GroupMember
from api.group.utils import generate_invite_token, decode_invite_token
from api.auth.models import User

from typing import Optional
from fastapi import Query

router = APIRouter()

@router.post("/create", response_model=GroupRead)
async def create_group(
    group_data: GroupCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Reserved group name check
    if group_data.name == "global":
        raise HTTPException(status_code=400, detail="Reserved group name")

    group = Group(
        name=group_data.name,
        public=group_data.public,
        owner_id=user.id
    )
    session.add(group)
    await session.flush()  # flush to get group.id

    # Deactivate existing groups for this user
    await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id)
        .values(active=False)
        .execution_options(synchronize_session=False)
    )

    # Add membership
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
        raise HTTPException(status_code=400, detail="Group name already exists.")

    return group


from typing import Optional
from fastapi.responses import JSONResponse


@router.post("/switch", response_model=Optional[GroupRead])
async def switch_group(
    group_id: Optional[uuid.UUID] = Query(None),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Deactivate all groups first
    await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id)
        .values(active=False)
        .execution_options(synchronize_session=False)
    )

    if group_id is None:
        await session.commit()
        return None

    # Activate the new group if joined
    result = await session.execute(
        update(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
        .values(active=True)
        .execution_options(synchronize_session=False)
    )

    if result.rowcount == 0:
        await session.rollback()
        raise HTTPException(status_code=404, detail="Group not found or not joined.")

    await session.commit()

    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

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
    group = result.scalars().first()

    if not group:
        return None

    return group


@router.get("/my", response_model=list[GroupRead])
async def my_groups(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # All groups the user is in
    result = await session.execute(
        select(Group)
        .join(UserGroup)
        .where(UserGroup.user_id == user.id)
    )
    groups = result.scalars().all()
    return groups


@router.get("/public", response_model=list[GroupRead])
async def public_groups(
    session: AsyncSession = Depends(get_async_session),
):
    # All public groups
    result = await session.execute(
        select(Group).where(Group.public == True)
    )
    groups = result.scalars().all()
    return groups


@router.get("/invite-link/{group_id}")
async def invite_link(
    group_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Check if user is a member of the group
    result = await session.execute(
        select(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
    )
    user_group = result.scalar_one_or_none()
    if not user_group:
        raise HTTPException(status_code=404, detail="Group not found or user not a member.")

    # Check if group is public
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group.public:
        raise HTTPException(status_code=400, detail="Group is public. No invite link needed.")

    token = generate_invite_token(group_id)
    return {"invite_link": f"{HOST_URL}/invite/{token}"}


@router.get("/invite/{token}", response_model=GroupRead)
async def join_group(
    token: str,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Decode token
    group_id = decode_invite_token(token)
    if not group_id:
        raise HTTPException(status_code=400, detail="Invalid token.")

    # Check if user is already in group
    result = await session.execute(
        select(UserGroup)
        .where(UserGroup.user_id == user.id, UserGroup.group_id == group_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member.")

    # Check if group is public
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group does not exist.")
    if group.public:
        raise HTTPException(status_code=400, detail="Group is public — no invite needed.")

    # Join
    user_group = UserGroup(user_id=user.id, group_id=group_id, active=True)
    session.add(user_group)
    await session.commit()

    return group


@router.get("/members/{group_id}", response_model=list[GroupMember])
async def get_group_members(
    group_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Confirm user is in the group
    check = await session.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    if not check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Group not found or user not in group.")

    # Confirm group exists
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    # Get all members
    result = await session.execute(
        select(UserGroup).where(UserGroup.group_id == group_id).join(UserGroup.user)
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
    # Check membership
    result = await session.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user.id)
    )
    user_group = result.scalar_one_or_none()
    if not user_group:
        raise HTTPException(status_code=404, detail="Group not found or user not in group.")

    # Check ownership
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    # TODO: Consider handing this off to first non-owner member to join
    if group.owner_id == user.id:
        # Owner leaving => delete entire group
        await session.execute(
            delete(UserGroup).where(UserGroup.group_id == group_id)
        )
        await session.execute(
            delete(Group).where(Group.id == group_id)
        )
        await session.commit()
        return {"detail": "Deleted group."}

    # Non-owner just leaves
    await session.delete(user_group)
    await session.commit()
    return {"detail": "Left group."}


@router.post("/delete/{group_id}")
async def delete_group(
    group_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Must be owner
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group.owner_id != user.id:
        raise HTTPException(status_code=403, detail="User is not the owner of the group.")

    # Delete group + all membership
    await session.execute(delete(UserGroup).where(UserGroup.group_id == group_id))
    await session.execute(delete(Group).where(Group.id == group_id))
    await session.commit()
    return {"detail": "Deleted group."}


@router.post("/kick/{group_id}/{user_id}")
async def kick_user(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # Must be owner
    group_result = await session.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if group.owner_id != user.id:
        raise HTTPException(status_code=403, detail="User is not the owner.")

    # Check target membership
    result = await session.execute(
        select(UserGroup).where(UserGroup.group_id == group_id, UserGroup.user_id == user_id)
    )
    target_membership = result.scalar_one_or_none()
    if not target_membership:
        raise HTTPException(status_code=404, detail="User not found in group.")

    # Kick user
    await session.delete(target_membership)
    await session.commit()
    return {"detail": "Kicked user."}

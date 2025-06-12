import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from api.auth.deps import update_last_seen_user
from api.drinks.models import Drink
from api.drinks.schemas import DrinkCreate, DrinkRead
from api.core.db import get_async_session
from api.auth.models import User
from api.realtime.actions import update_user
from api.realtime.scheduler import update_archival

router = APIRouter()


@router.post("", response_model=DrinkRead)
@router.post("/", response_model=DrinkRead)
async def create_drink(
    drink: DrinkCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(update_last_seen_user),
):
    db_drink = Drink(**drink.dict(), user_id=user.id)
    session.add(db_drink)
    await session.commit()
    await session.refresh(db_drink)
    asyncio.create_task(update_archival(user.id))
    asyncio.create_task(update_user(user))
    return db_drink


@router.delete("/last", response_model=DrinkRead)
async def delete_last_drink(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(update_last_seen_user),
):
    result = await session.execute(
        select(Drink)
        .where(Drink.user_id == user.id)
        .order_by(Drink.add_time.desc())
        .limit(1)
    )
    last_drink = result.scalar_one_or_none()

    if not last_drink:
        raise HTTPException(status_code=404, detail="No drinks found to delete")

    await session.delete(last_drink)
    await session.commit()
    asyncio.create_task(update_archival(user.id))
    asyncio.create_task(update_user(user))
    return last_drink


@router.get("/mine", response_model=list[DrinkRead])
async def get_my_drinks(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(update_last_seen_user),
):
    result = await session.execute(
        select(Drink)
        .where(Drink.user_id == user.id)
        .order_by(Drink.add_time.desc())
    )
    return result.scalars().all()


@router.put("/{drink_id}", response_model=DrinkRead)
async def update_drink(
    drink_id: UUID,
    drink: DrinkCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(update_last_seen_user),
):
    db_drink = await session.get(Drink, drink_id)
    if not db_drink or db_drink.user_id != user.id:
        raise HTTPException(status_code=404, detail="Drink not found")

    for field, value in drink.dict().items():
        setattr(db_drink, field, value)

    await session.commit()
    await session.refresh(db_drink)
    asyncio.create_task(update_archival(user.id))
    asyncio.create_task(update_user(user))
    return db_drink


@router.delete("/{drink_id}", response_model=DrinkRead)
async def delete_drink(
    drink_id: UUID,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(update_last_seen_user),
):
    db_drink = await session.get(Drink, drink_id)
    if not db_drink or db_drink.user_id != user.id:
        raise HTTPException(status_code=404, detail="Drink not found")

    await session.delete(db_drink)
    await session.commit()
    asyncio.create_task(update_archival(user.id))
    asyncio.create_task(update_user(user))
    return db_drink

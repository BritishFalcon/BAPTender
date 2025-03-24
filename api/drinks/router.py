from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.drinks.models import Drink
from api.drinks.schemas import DrinkCreate, DrinkRead
from api.auth.users import current_active_user
from api.auth.models import User, get_async_session

router = APIRouter()


@router.post("/", response_model=DrinkRead)
async def create_drink(
    drink: DrinkCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    db_drink = Drink(**drink.dict(), user_id=user.id)
    session.add(db_drink)
    await session.commit()
    await session.refresh(db_drink)
    return db_drink


@router.delete("/last", response_model=DrinkRead)
async def delete_last_drink(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    # Find the most recent drink by add_time
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
    return last_drink


@router.get("/mine", response_model=list[DrinkRead])
async def get_my_drinks(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    result = await session.execute(
        select(Drink)
        .where(Drink.user_id == user.id)
        .order_by(Drink.add_time.desc())
    )
    return result.scalars().all()

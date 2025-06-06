import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.base import JobLookupError
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from api.auth.models import User
from api.drinks.models import Drink, ArchivedDrink
from api.group.models import Group, UserGroup
from api.core.db import get_async_session
from api.realtime.calculations import drinks_to_bac
from api.realtime.actions import update_user

scheduler = AsyncIOScheduler()
scheduler.start()


async def archive_if_sober(user_id: uuid.UUID):
    async for session in get_async_session():
        user = await session.get(User, user_id)
        if not user: return

        drinks_result = await session.execute(
            select(Drink).where(Drink.user_id == user_id).order_by(Drink.add_time.asc())
        )
        drinks = drinks_result.scalars().all()

        if not drinks: return

        for d in drinks:
            archived = ArchivedDrink(
                id=d.id, user_id=d.user_id, nickname=d.nickname,
                add_time=d.add_time, volume=d.volume, strength=d.strength,
            )
            session.add(archived)
            await session.delete(d)

        await session.commit()

        ug_result = await session.execute(
            select(UserGroup).options(selectinload(UserGroup.group)).where(
                UserGroup.user_id == user.id,
                UserGroup.active.is_(True),
            )
        )
        user_group = ug_result.scalars().first()
        active_group = user_group.group if user_group else None
        await update_user(user, active_group)


async def schedule_archive(user_id: uuid.UUID, task_time: datetime):
    if task_time <= datetime.now(timezone.utc):
        await archive_if_sober(user_id)
        return

    task_id = f"archive_{user_id}"
    scheduler.add_job(
        func=archive_if_sober, trigger='date', next_run_time=task_time,
        args=[user_id], id=task_id, replace_existing=True,
    )


async def update_archival(user_id: uuid.UUID):
    async for session in get_async_session():
        user = await session.get(User, user_id)
        if not user: return

        drinks_result = await session.execute(
            select(Drink).where(Drink.user_id == user_id).order_by(Drink.add_time.asc())
        )
        drinks = drinks_result.scalars().all()
        if not drinks: return

        drinks_data = [{"volume": d.volume, "strength": d.strength, "time": d.add_time} for d in drinks]
        age = (datetime.now(timezone.utc).date() - user.dob).days / 365.25
        user_data = {"weight": user.weight, "gender": user.gender, "height": user.height, "age": age}

        states = drinks_to_bac(drinks_data, user_data)
        if not states: return

        sober_time = states[-1]["time"]
        await schedule_archive(user_id, sober_time)
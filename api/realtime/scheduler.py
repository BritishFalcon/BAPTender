import asyncio

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.base import JobLookupError
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from api.auth.models import User
from api.drinks.models import Drink, ArchivedDrink
from api.core.db import get_async_session
from api.realtime.calculations import drinks_to_bac
from api.realtime.router import broadcast_user_update
from api.realtime.utils import get_active_group_ws

scheduler = AsyncIOScheduler()
scheduler.start()

# TODO: An all-encompassing "update" function that passes changes to users and queues archival


# TODO: Check if doing a new session is actually the best move here
# TODO: We don't necessary need to check if they're sober, so consider compartmentalizing
async def archive_if_sober(user_id: uuid.UUID):
    async for session in get_async_session():
        # 1. Fetch user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return

        # 2. Get all drinks
        result = await session.execute(
            select(Drink).where(Drink.user_id == user_id).order_by(Drink.add_time.asc())
        )
        drinks = result.scalars().all()

        if not drinks:
            return

        # 3. Format
        drinks_data = [
            {
                "volume": d.volume,
                "strength": d.strength,
                "time": d.add_time,
            }
            for d in drinks
        ]

        age = (datetime.now(timezone.utc).date() - user.dob).days / 365
        user_data = {
            "weight": user.weight,
            "gender": user.gender,
            "height": user.height,
            "age": age,
        }

        # 4. Calculate
        states = drinks_to_bac(drinks_data, user_data)

        """
        if not states:
            return
        """

        sober_time = states[-1]["time"] if isinstance(states[-1], dict) else states[-1].time
        if sober_time > datetime.now(timezone.utc):
            asyncio.create_task(schedule_archive(user_id, sober_time))
            return

        # 5. Move drinks to archive
        for d in drinks:
            archived = ArchivedDrink(
                id=d.id,
                user_id=d.user_id,
                nickname=d.nickname,
                add_time=d.add_time,
                volume=d.volume,
                strength=d.strength,
            )
            session.add(archived)
            await session.delete(d)

        await session.commit()

    # 6. Push an update for the applicable users
    group = await get_active_group_ws(user.id)
    asyncio.create_task(broadcast_user_update(user, group))


async def schedule_archive(user_id: uuid.UUID, task_time: datetime):

    if task_time <= datetime.now(timezone.utc):
        await archive_if_sober(user_id)
        return

    task_id = f"archive_{user_id}"
    try:
        scheduler.remove_job(task_id)
    except JobLookupError:
        pass

    scheduler.add_job(
        func=archive_if_sober,
        trigger='date',
        next_run_time=task_time,
        args=[user_id],
        id=task_id,
        replace_existing=True,
    )


async def update_archival(user_id: uuid.UUID):
    async for session in get_async_session():
        # Fetch user
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")
            return

        # Fetch drinks
        result = await session.execute(
            select(Drink).where(Drink.user_id == user_id).order_by(Drink.add_time.asc())
        )
        drinks = result.scalars().all()

        if not drinks:
            raise ValueError("No drinks found for user")
            return

        drinks_data = [
            {
                "volume": d.volume,
                "strength": d.strength,
                "time": d.add_time,
            }
            for d in drinks
        ]

        age = (datetime.now(timezone.utc).date() - user.dob).days / 365
        user_data = {
            "weight": user.weight,
            "gender": user.gender,
            "height": user.height,
            "age": age,
        }

        states = drinks_to_bac(drinks_data, user_data)

        sober_time = states[-1]["time"]
        task_time = sober_time + timedelta(seconds=1)
        await schedule_archive(user_id, task_time)

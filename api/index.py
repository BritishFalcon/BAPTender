from api.auth.router import router as auth_router
from api.drinks.router import router as drinks_router
from api.group.router import router as group_router
from api.realtime.router import router as realtime_router
from api.core.db import create_db_and_tables

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from api.core.db import get_async_session
from api.drinks.models import Drink
from api.realtime.scheduler import update_archival
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()

    # Update archival for all users, important to do this on startup for if server went down
    async for session in get_async_session():
        result = await session.execute(select(Drink.user_id).distinct())
        user_ids = result.scalars().all()

        for user_id in user_ids:
            asyncio.create_task(update_archival(user_id))

    yield

app = FastAPI(lifespan=lifespan, redirect_slashes=False)

app.include_router(auth_router, prefix="/auth")
app.include_router(drinks_router, prefix="/drinks", tags=["drinks"])
app.include_router(group_router, prefix="/group", tags=["group"])
app.include_router(realtime_router, prefix="/realtime", tags=["realtime"])

origins = [
    "http://localhost:3000",  # your frontend URL
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
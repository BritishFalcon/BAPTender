from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.auth.router import router as auth_router
from api.drinks.router import router as drinks_router
from api.group.router import router as group_router

from api.core.db import create_db_and_tables, HOST_URL


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.include_router(auth_router, prefix="/auth")
app.include_router(drinks_router, prefix="/drinks", tags=["drinks"])
app.include_router(group_router, prefix="/group", tags=["group"])


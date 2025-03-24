from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.auth.router import router as auth_router
from api.drinks.router import router as drinks_router

from api.auth.models import User
from api.drinks.models import Drink, ArchivedDrink
from api.core.db import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

print("Hello from app.py")
app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json", lifespan=lifespan)

app.include_router(auth_router, prefix="/auth")
app.include_router(drinks_router, prefix="/drinks", tags=["drinks"])


@app.get("/api/py/helloFastApi")
def hello_fast_api():
    return {"message": "Hello from FastAPI"}


@app.get("/")
async def root():
    return {"message": "Hello you are cringe"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}

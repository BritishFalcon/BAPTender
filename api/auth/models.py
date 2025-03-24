from typing import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Column, String, Float, Date, Boolean, Integer
from api.core.db import Base, DATABASE_URL, get_async_session


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"
    display_name = Column(String(length=20), nullable=False)
    weight = Column(Float, nullable=False)
    height = Column(Float, nullable=True)
    gender = Column(String(length=6), nullable=False)  # "MALE" / "FEMALE"
    dob = Column(Date, nullable=False)
    real_dob = Column(Boolean, nullable=False)

    drinks = relationship("Drink", back_populates="user", cascade="all, delete-orphan")
    archived_drinks = relationship("ArchivedDrink", back_populates="user", cascade="all, delete-orphan")


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

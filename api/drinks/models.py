import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, Float, Date, Boolean, Integer, ForeignKey
from api.core.db import Base, DATABASE_URL


class Drink(Base):
    __tablename__ = "drinks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="drinks")

    nickname = Column(String(length=20), nullable=True)
    add_time = Column(Date, nullable=False)
    volume = Column(Float, nullable=False)
    strength = Column(Float, nullable=False)


class ArchivedDrink(Base):
    __tablename__ = "archived_drinks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="archived_drinks")

    nickname = Column(String(length=20), nullable=True)
    add_time = Column(Date, nullable=False)
    volume = Column(Float, nullable=False)
    strength = Column(Float, nullable=False)


engine = create_async_engine(DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

from sqlalchemy import Column, String, Float, Date, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID

from api.core.db import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    display_name = Column(String(length=20), nullable=False)
    weight = Column(Float, nullable=False)
    height = Column(Float, nullable=True)
    gender = Column(String(length=6), nullable=False)
    dob = Column(Date, nullable=False)
    real_dob = Column(Boolean, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    drinks = relationship("Drink", back_populates="user", cascade="all, delete-orphan")
    archived_drinks = relationship("ArchivedDrink", back_populates="user", cascade="all, delete-orphan")
    groups = relationship("UserGroup", back_populates="user", cascade="all, delete-orphan")

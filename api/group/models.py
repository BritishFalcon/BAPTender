import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from api.core.db import Base
from sqlalchemy.dialects.postgresql import UUID


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(length=50), unique=True, nullable=False)
    public = Column(Boolean, default=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("UserGroup", back_populates="group", cascade="all, delete-orphan")


class UserGroup(Base):
    __tablename__ = "user_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)

    active = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="groups")
    group = relationship("Group", back_populates="members")

    __table_args__ = (
        Index(
            "uq_user_active_per_user",
            "user_id",
            unique=True,
            postgresql_where=(active.is_(True)),
        ),
    )

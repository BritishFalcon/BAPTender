import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    public: bool = False


class GroupCreate(GroupBase):
    pass


class GroupRead(GroupBase):
    id: uuid.UUID
    created_at: datetime
    owner_id: uuid.UUID

    class Config:
        orm_mode = True


class UserGroupRead(BaseModel):
    group: GroupRead
    active: bool

    class Config:
        orm_mode = True


class GroupMember(BaseModel):
    id: uuid.UUID
    display_name: str
    active: bool
    is_owner: bool

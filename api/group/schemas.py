import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class GroupBase(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    public: bool = False


class GroupCreate(GroupBase):
    pass


class GroupRead(GroupBase):
    id: uuid.UUID
    created_at: datetime
    owner_id: uuid.UUID

    class Config:
        from_attributes = True


class UserGroupRead(BaseModel):
    group: GroupRead
    active: bool

    class Config:
        from_attributes = True


class GroupMember(BaseModel):
    id: uuid.UUID
    display_name: str
    active: bool
    is_owner: bool

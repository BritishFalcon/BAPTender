from pydantic import BaseModel, constr, confloat
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone


class DrinkBase(BaseModel):
    nickname: Optional[constr(min_length=1, max_length=50)] = None
    add_time: datetime = datetime.now(tz=timezone.utc)
    volume: confloat(ge=0.0, le=5000.0)  # ml
    strength: confloat(ge=0.0, le=1.0)  # ABV


class DrinkCreate(DrinkBase):
    pass


class DrinkRead(DrinkBase):
    id: UUID
    user_id: UUID

    class Config:
        orm_mode = True  # Required for SQLAlchemy ORM -> Pydantic


class ArchivedDrinkRead(DrinkRead):
    pass

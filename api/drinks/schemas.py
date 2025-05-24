from pydantic import BaseModel, field_validator, constr, confloat
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone


class DrinkBase(BaseModel):
    nickname: Optional[constr(min_length=1, max_length=50, strict=True)] = None
    add_time: datetime = datetime.now(tz=timezone.utc)
    volume: confloat(ge=0.0, le=5000.0, strict=True)  # ml
    strength: confloat(ge=0.0, le=1.0, strict=True)  # ABV


class DrinkCreate(DrinkBase):
    pass


class DrinkRead(DrinkBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True  # Required for SQLAlchemy ORM -> Pydantic


class ArchivedDrinkRead(DrinkRead):
    pass

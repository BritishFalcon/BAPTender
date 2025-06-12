import uuid
from datetime import date, datetime
from typing import Optional

from fastapi_users import schemas
from fastapi_users.schemas import BaseUserCreate, BaseUserUpdate, BaseUser
from pydantic import BaseModel, field_validator, constr, confloat, EmailStr, Field
from pydantic.json_schema import SkipJsonSchema
from re import match

from api.config import (
    MIN_WEIGHT,
    MAX_WEIGHT,
    MIN_HEIGHT,
    MAX_HEIGHT,
    MIN_AGE,
    MAX_AGE,
)
from api.utils import calculate_age


class UserBase(BaseModel):
    display_name: constr(min_length=3, max_length=20, strict=True)
    weight: confloat(ge=MIN_WEIGHT, le=MAX_WEIGHT, strict=True)
    gender: constr(strict=True)
    height: Optional[confloat(ge=MIN_HEIGHT, le=MAX_HEIGHT, strict=True)] = None
    dob: date
    real_dob: bool

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        rgx = r"^[a-zA-Z0-9_]+$"
        if not match(rgx, v):
            raise ValueError("Display name must contain only letters, numbers, and underscores!")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, dob: date) -> date:
        age = calculate_age(dob)
        if not (MIN_AGE <= age <= MAX_AGE):
            raise ValueError(
                f"Age must be between {MIN_AGE} and {MAX_AGE} years!"
            )
        return dob

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, gender: str) -> str:
        if gender.upper() not in ["MALE", "FEMALE"]:
            raise ValueError("Gender must be either Male or Female!")
        return gender.upper()


class UserRead(schemas.BaseUser[uuid.UUID], UserBase):
    id: uuid.UUID
    created_at: datetime
    last_seen: datetime
    is_active: Optional[bool] = Field(None, exclude=True)
    is_superuser: Optional[bool] = Field(None, exclude=True)
    is_verified: Optional[bool] = Field(None, exclude=True)

    class Config:
        from_attributes = True


class UserCreate(BaseUserCreate):
    email: EmailStr
    password: str
    display_name: constr(min_length=3, max_length=20, strict=True)
    weight: confloat(ge=MIN_WEIGHT, le=MAX_WEIGHT, strict=True)
    gender: constr(strict=True)
    height: Optional[confloat(ge=MIN_HEIGHT, le=MAX_HEIGHT, strict=True)]
    dob: date
    real_dob: bool

    # Hide internal fields from the docs and incoming payload
    is_active: SkipJsonSchema[bool] = None
    is_superuser: SkipJsonSchema[bool] = None
    is_verified: SkipJsonSchema[bool] = None


class UserUpdate(BaseUserUpdate):
    display_name: Optional[constr(min_length=3, max_length=20, strict=True)] = None
    weight: Optional[float] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    dob: Optional[date] = None
    real_dob: Optional[bool] = None

    @field_validator("weight")
    @classmethod
    def validate_weight(cls, weight: float) -> float:
        if weight is None:
            return weight
        if not (MIN_WEIGHT <= weight <= MAX_WEIGHT):
            raise ValueError(
                f"Weight must be between {MIN_WEIGHT} and {MAX_WEIGHT} kg!"
            )
        return weight

    @field_validator("height")
    @classmethod
    def validate_height(cls, height: float) -> float:
        if height is None:
            return height
        if not (MIN_HEIGHT <= height <= MAX_HEIGHT):
            raise ValueError(
                f"Height must be between {MIN_HEIGHT} and {MAX_HEIGHT} cm!"
            )
        return height

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        rgx = r"^[a-zA-Z0-9_]+$"
        if not match(rgx, v):
            raise ValueError("Display name must contain only letters, numbers, and underscores!")
        return v

    @field_validator("dob")
    @classmethod
    def validate_dob(cls, dob: date) -> date:
        age = calculate_age(dob)
        if not (MIN_AGE <= age <= MAX_AGE):
            raise ValueError(
                f"Age must be between {MIN_AGE} and {MAX_AGE} years!"
            )
        return dob

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, gender: str) -> str:
        if gender.upper() not in ["MALE", "FEMALE"]:
            raise ValueError("Gender must be either Male or Female!")
        return gender.upper()

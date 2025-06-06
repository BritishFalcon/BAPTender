import uuid
from datetime import date, datetime
from typing import Optional

from fastapi_users import schemas
from fastapi_users.schemas import BaseUserCreate, BaseUserUpdate, BaseUser
from pydantic import BaseModel, field_validator, constr, confloat, EmailStr, Field
from pydantic.json_schema import SkipJsonSchema
from re import match


class UserBase(BaseModel):
    display_name: constr(min_length=3, max_length=20, strict=True)
    weight: confloat(ge=10.0, le=650.0, strict=True)
    gender: constr(strict=True)
    height: Optional[confloat(ge=100.0, le=250.0, strict=True)] = None
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
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if not (10 <= age <= 150):
            raise ValueError("Age must be between 10 and 150 years!")
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
    weight: confloat(ge=10.0, le=650.0, strict=True)
    gender: constr(strict=True)
    height: Optional[confloat(ge=100.0, le=250.0, strict=True)]
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
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if not (10 <= age <= 150):
            raise ValueError("Age must be between 10 and 150 years!")
        return dob

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, gender: str) -> str:
        if gender.upper() not in ["MALE", "FEMALE"]:
            raise ValueError("Gender must be either Male or Female!")
        return gender.upper()

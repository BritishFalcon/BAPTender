from fastapi import APIRouter, Depends
from api.auth.users import auth_backend, fastapi_users, current_active_user
from api.auth.models import User
from api.auth.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/jwt", tags=["auth"]
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate), prefix="", tags=["auth"]
)
router.include_router(
    fastapi_users.get_reset_password_router(), prefix="", tags=["auth"]
)
router.include_router(
    fastapi_users.get_verify_router(UserRead), prefix="", tags=["auth"]
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate), prefix="/users", tags=["users"]
)


@router.get("/authenticated-route")
async def authenticated_route(user: User = Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}

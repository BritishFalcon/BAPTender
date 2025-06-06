import uuid
import base64
from fastapi import HTTPException


def generate_invite_token(group_id: uuid.UUID) -> str:
    return base64.urlsafe_b64encode(group_id.bytes).decode("utf-8").rstrip("=")


def decode_invite_token(token: str) -> uuid.UUID:
    try:
        padded = token + "=" * (4 - len(token) % 4)  # Fix padding
        return uuid.UUID(bytes=base64.urlsafe_b64decode(padded))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token.")

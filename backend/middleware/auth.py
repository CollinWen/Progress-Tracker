"""
Authentication middleware and dependencies for FastAPI.
"""
from fastapi import Header, HTTPException, Depends
from typing import Optional

from services.auth_service import auth_service
from models.auth import AuthUser


async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthUser:
    """
    Dependency to extract and verify user from JWT token.

    Args:
        authorization: Authorization header (Bearer token)

    Returns:
        AuthUser

    Raises:
        HTTPException: If token is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user = auth_service.verify_session_token(authorization)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[AuthUser]:
    """
    Dependency to optionally extract user from JWT token.
    Returns None if no token provided or token is invalid.

    Args:
        authorization: Authorization header (Bearer token)

    Returns:
        AuthUser or None
    """
    if not authorization:
        return None

    try:
        user = auth_service.verify_session_token(authorization)
        return user
    except ValueError:
        return None

"""
Authentication middleware for Firebase Auth tokens.
"""
import logging
from fastapi import Header, HTTPException, status
from typing import Optional

from services.firebase_service import firebase_service

logger = logging.getLogger(__name__)


class AuthUser:
    """Authenticated user information."""

    def __init__(self, uid: str, email: str, name: Optional[str] = None):
        self.uid = uid
        self.email = email
        self.name = name or email


async def get_current_user(authorization: str = Header(...)) -> AuthUser:
    """
    Verify Firebase ID token and return authenticated user.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        AuthUser object

    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )

    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>"
        )

    token = parts[1]

    try:
        # Verify Firebase ID token
        decoded_token = firebase_service.verify_token(token)

        user = AuthUser(
            uid=decoded_token['uid'],
            email=decoded_token.get('email', ''),
            name=decoded_token.get('name')
        )

        logger.info(f"Authenticated user: {user.uid}")
        return user

    except ValueError as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

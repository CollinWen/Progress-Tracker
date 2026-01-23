"""
Pydantic models for authentication.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class AuthUser(BaseModel):
    """User information from Google OAuth."""
    id: str  # Google user ID
    email: EmailStr
    name: str
    picture: Optional[str] = None  # Profile picture URL


class TokenData(BaseModel):
    """Data stored in JWT token."""
    sub: str  # Subject (user ID)
    email: str
    name: str
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp


class SignInRequest(BaseModel):
    """Request to sign in with Google OAuth code."""
    code: str  # Authorization code from Google


class SignInResponse(BaseModel):
    """Response after successful sign-in."""
    access_token: str  # JWT token for API access
    user: AuthUser
    file_id: Optional[str] = None  # Google Drive file ID for data.json


class AuthMeResponse(BaseModel):
    """Response for /auth/me endpoint."""
    user: AuthUser


class ErrorResponse(BaseModel):
    """Error response structure."""
    detail: str
    error_code: Optional[str] = None

"""
Authentication service for Google OAuth and JWT management.
"""
import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow

from config import settings
from models.auth import AuthUser, TokenData
from services.token_store import token_store

logger = logging.getLogger(__name__)


class AuthService:
    """Handles Google OAuth flow and JWT token management."""

    def __init__(self):
        """Initialize auth service with Google OAuth configuration."""
        # Note: In production, client_config should come from Google Cloud credentials file
        # For now, we'll use environment variables
        pass

    def create_oauth_flow(self) -> Flow:
        """
        Create Google OAuth flow.

        Returns:
            Flow object for OAuth
        """
        client_config = {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_redirect_uri],
            }
        }

        flow = Flow.from_client_config(
            client_config=client_config,
            scopes=settings.scopes_list,
            redirect_uri=settings.google_redirect_uri,
        )

        return flow

    def get_authorization_url(self) -> str:
        """
        Get Google OAuth authorization URL.

        Returns:
            Authorization URL to redirect user to
        """
        flow = self.create_oauth_flow()
        auth_url, _ = flow.authorization_url(
            access_type="offline",  # Request refresh token
            include_granted_scopes="true",  # Incremental authorization
            prompt="consent",  # Force consent screen to get refresh token
        )
        logger.info("Generated authorization URL")
        return auth_url

    async def exchange_code_for_tokens(self, code: str) -> Dict[str, any]:
        """
        Exchange authorization code for Google OAuth tokens.

        Args:
            code: Authorization code from Google redirect

        Returns:
            Dict with access_token, refresh_token, expires_in, id_token

        Raises:
            ValueError: If code exchange fails
        """
        try:
            # Exchange code for tokens manually using requests to avoid strict scope validation
            import requests

            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if token_response.status_code != 200:
                logger.error(f"Token exchange failed: {token_response.text}")
                raise ValueError(f"Token exchange failed: {token_response.json().get('error_description', 'Unknown error')}")

            token_data = token_response.json()

            # Verify ID token and get user info
            id_info = id_token.verify_oauth2_token(
                token_data["id_token"],
                google_requests.Request(),
                settings.google_client_id,
            )

            # Store tokens in token store
            user_id = id_info["sub"]
            expires_in = token_data.get("expires_in", 3600)

            token_store.store_tokens(
                user_id=user_id,
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                expires_in=expires_in,
            )

            logger.info(f"Successfully exchanged code for tokens for user {user_id}")

            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": expires_in,
                "id_token": token_data["id_token"],
                "user_info": id_info,
            }

        except Exception as e:
            logger.error(f"Failed to exchange code for tokens: {str(e)}")
            raise ValueError(f"Failed to authenticate with Google: {str(e)}")

    def create_session_token(self, user_info: Dict[str, any]) -> str:
        """
        Create JWT session token for frontend.

        Args:
            user_info: User information from Google ID token

        Returns:
            JWT token string
        """
        now = datetime.utcnow()
        expiration = now + timedelta(days=settings.jwt_expiration_days)

        payload: TokenData = {
            "sub": user_info["sub"],  # Google user ID
            "email": user_info["email"],
            "name": user_info.get("name", user_info["email"]),
            "iat": int(now.timestamp()),
            "exp": int(expiration.timestamp()),
        }

        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

        logger.info(f"Created session token for user {user_info['sub']}")
        return token

    def verify_session_token(self, token: str) -> AuthUser:
        """
        Verify and decode JWT session token.

        Args:
            token: JWT token from Authorization header

        Returns:
            AuthUser with user information

        Raises:
            ValueError: If token is invalid or expired
        """
        try:
            # Remove "Bearer " prefix if present
            if token.startswith("Bearer "):
                token = token[7:]

            payload = jwt.decode(
                token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )

            # Verify expiration (jwt.decode already checks this, but being explicit)
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                raise ValueError("Token has expired")

            return AuthUser(
                id=payload["sub"],
                email=payload["email"],
                name=payload["name"],
                picture=payload.get("picture"),
            )

        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise ValueError("Token has expired")
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise ValueError("Invalid token")
        except Exception as e:
            logger.error(f"Error verifying token: {str(e)}")
            raise ValueError("Failed to verify token")

    def get_user_access_token(self, user_id: str) -> Optional[str]:
        """
        Get valid Google access token for a user.
        Automatically refreshes if expired.

        Args:
            user_id: Google user ID

        Returns:
            Valid access token or None
        """
        access_token = token_store.get_access_token(user_id)
        if access_token:
            return access_token

        # Token expired, try to refresh
        logger.info(f"Attempting to refresh token for user {user_id}")
        return self.refresh_access_token(user_id)

    def refresh_access_token(self, user_id: str) -> Optional[str]:
        """
        Refresh Google access token using refresh token.

        Args:
            user_id: Google user ID

        Returns:
            New access token or None if refresh fails
        """
        refresh_token = token_store.get_refresh_token(user_id)
        if not refresh_token:
            logger.error(f"No refresh token found for user {user_id}")
            return None

        try:
            from google.oauth2.credentials import Credentials
            from google.auth.transport.requests import Request

            credentials = Credentials(
                token=None,  # Will be refreshed
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            )

            # Refresh the token
            credentials.refresh(Request())

            # Store new access token
            expires_in = (
                credentials.expiry.timestamp() - datetime.utcnow().timestamp()
                if credentials.expiry
                else 3600
            )
            token_store.update_access_token(user_id, credentials.token, int(expires_in))

            logger.info(f"Successfully refreshed access token for user {user_id}")
            return credentials.token

        except Exception as e:
            logger.error(f"Failed to refresh token for user {user_id}: {str(e)}")
            return None

    def sign_out(self, user_id: str) -> None:
        """
        Sign out user by invalidating tokens.

        Args:
            user_id: Google user ID
        """
        token_store.invalidate_tokens(user_id)
        logger.info(f"User {user_id} signed out")


# Global auth service instance
auth_service = AuthService()

"""
In-memory token store for user OAuth tokens.
In production, this could be replaced with Redis or another cache.
"""
from typing import Dict, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TokenStore:
    """
    Thread-safe in-memory store for user OAuth tokens.
    Stores both access tokens and refresh tokens.
    """

    def __init__(self):
        # Structure: { user_id: { "access_token": str, "refresh_token": str, "expires_at": datetime } }
        self._tokens: Dict[str, Dict[str, any]] = {}

    def store_tokens(
        self, user_id: str, access_token: str, refresh_token: str, expires_in: int
    ) -> None:
        """
        Store OAuth tokens for a user.

        Args:
            user_id: Google user ID
            access_token: Google access token
            refresh_token: Google refresh token
            expires_in: Seconds until access token expires
        """
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        self._tokens[user_id] = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
        }
        logger.info(f"Stored tokens for user {user_id}, expires at {expires_at}")

    def get_tokens(self, user_id: str) -> Optional[Dict[str, any]]:
        """
        Get stored tokens for a user.

        Args:
            user_id: Google user ID

        Returns:
            Dict with access_token, refresh_token, expires_at or None
        """
        return self._tokens.get(user_id)

    def get_access_token(self, user_id: str) -> Optional[str]:
        """
        Get valid access token for a user.

        Args:
            user_id: Google user ID

        Returns:
            Access token or None if not found or expired
        """
        tokens = self.get_tokens(user_id)
        if not tokens:
            logger.warning(f"No tokens found for user {user_id}")
            return None

        # Check if token is still valid (with 5 minute buffer)
        if tokens["expires_at"] < datetime.utcnow() + timedelta(minutes=5):
            logger.info(f"Access token expired for user {user_id}")
            return None

        return tokens["access_token"]

    def get_refresh_token(self, user_id: str) -> Optional[str]:
        """
        Get refresh token for a user.

        Args:
            user_id: Google user ID

        Returns:
            Refresh token or None
        """
        tokens = self.get_tokens(user_id)
        return tokens["refresh_token"] if tokens else None

    def update_access_token(self, user_id: str, access_token: str, expires_in: int) -> None:
        """
        Update access token after refresh.

        Args:
            user_id: Google user ID
            access_token: New access token
            expires_in: Seconds until token expires
        """
        if user_id not in self._tokens:
            logger.error(f"Cannot update token: user {user_id} not found")
            return

        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        self._tokens[user_id]["access_token"] = access_token
        self._tokens[user_id]["expires_at"] = expires_at
        logger.info(f"Updated access token for user {user_id}")

    def invalidate_tokens(self, user_id: str) -> None:
        """
        Remove tokens for a user (sign out).

        Args:
            user_id: Google user ID
        """
        if user_id in self._tokens:
            del self._tokens[user_id]
            logger.info(f"Invalidated tokens for user {user_id}")

    def cleanup_expired(self) -> int:
        """
        Remove expired tokens from store.

        Returns:
            Number of users cleaned up
        """
        now = datetime.utcnow()
        expired_users = [
            user_id
            for user_id, tokens in self._tokens.items()
            if tokens["expires_at"] < now
        ]

        for user_id in expired_users:
            del self._tokens[user_id]

        if expired_users:
            logger.info(f"Cleaned up {len(expired_users)} expired token entries")

        return len(expired_users)


# Global token store instance
token_store = TokenStore()

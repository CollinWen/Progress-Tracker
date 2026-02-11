"""
Firebase service for initializing and managing Firebase Admin SDK.
"""
import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional

logger = logging.getLogger(__name__)


class FirebaseService:
    """Singleton service for Firebase operations."""

    _instance: Optional['FirebaseService'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Firebase Admin SDK (only once)."""
        if not FirebaseService._initialized:
            self._initialize_firebase()
            FirebaseService._initialized = True

    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK with credentials."""
        try:
            # Check if already initialized
            if firebase_admin._apps:
                logger.info("Firebase already initialized")
                return

            # Check if running in Cloud Run (K_SERVICE env var is set)
            if os.getenv("K_SERVICE"):
                logger.info("Initializing Firebase with Application Default Credentials (Cloud Run)")
                firebase_admin.initialize_app()
            else:
                # Local development: try credentials from environment variable first
                cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
                if cred_json:
                    import json
                    logger.info("Initializing Firebase with credentials from FIREBASE_CREDENTIALS_JSON")
                    cred_dict = json.loads(cred_json)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
                else:
                    # Try to use credentials file if provided
                    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
                    if cred_path and os.path.exists(cred_path):
                        logger.info(f"Initializing Firebase with credentials from {cred_path}")
                        cred = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)
                    else:
                        # Use default credentials (for Google Cloud environment)
                        logger.info("Initializing Firebase with default credentials")
                        firebase_admin.initialize_app()

            logger.info("Firebase Admin SDK initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            raise

    @property
    def db(self):
        """Get Firestore database instance."""
        return firestore.client()

    @property
    def auth(self):
        """Get Firebase Auth instance."""
        return auth

    def verify_token(self, id_token: str) -> dict:
        """
        Verify Firebase ID token.

        Args:
            id_token: Firebase ID token from client

        Returns:
            Decoded token (user claims)

        Raises:
            ValueError: If token is invalid
        """
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise ValueError(f"Invalid token: {str(e)}")


# Global singleton instance
firebase_service = FirebaseService()

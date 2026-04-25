"""
Firebase service for initializing and managing Firebase Admin SDK.
"""
import os
import logging
import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)


class FirebaseService:
    """Singleton service for Firebase operations."""

    _instance: Optional['FirebaseService'] = None
    _initialized: bool = False
    _db_client = None

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
                database_name = settings.firebase_database_name or "(default)"
                logger.info(f"Using Firestore database: {database_name}")
                if database_name != "(default)":
                    self._db_client = firestore.Client(
                        project=settings.firebase_project_id,
                        database=database_name
                    )
                else:
                    self._db_client = firestore.Client(
                        project=settings.firebase_project_id
                    )
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
                    # Try to use credentials file if provided (from settings first, then env var)
                    cred_path = settings.firebase_credentials_path or os.getenv("FIREBASE_CREDENTIALS_PATH")
                    if cred_path and os.path.exists(cred_path):
                        logger.info(f"Initializing Firebase with credentials from {cred_path}")
                        cred = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)

                        # Get database name from settings and create client
                        database_name = settings.firebase_database_name or "(default)"
                        logger.info(f"Using Firestore database: {database_name}")

                        # Create Firestore client with specific database using google-cloud-firestore
                        # Use the project_id from settings
                        if database_name != "(default)":
                            self._db_client = firestore.Client(
                                project=settings.firebase_project_id,
                                database=database_name,
                                credentials=cred.get_credential()
                            )
                        else:
                            self._db_client = firestore.Client(
                                project=settings.firebase_project_id,
                                credentials=cred.get_credential()
                            )
                    else:
                        # Fail explicitly instead of trying default credentials
                        error_msg = f"Firebase credentials not found. FIREBASE_CREDENTIALS_PATH: {cred_path}, exists: {os.path.exists(cred_path) if cred_path else False}"
                        logger.error(error_msg)
                        raise ValueError(error_msg)

            logger.info("Firebase Admin SDK initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            raise

    @property
    def db(self):
        """Get Firestore database instance."""
        if self._db_client is None:
            # Fallback if not initialized properly
            database_name = settings.firebase_database_name or "(default)"
            cred_path = settings.firebase_credentials_path or os.getenv("FIREBASE_CREDENTIALS_PATH")
            cred = credentials.Certificate(cred_path)

            if database_name != "(default)":
                self._db_client = firestore.Client(
                    project=settings.firebase_project_id,
                    database=database_name,
                    credentials=cred.get_credential()
                )
            else:
                self._db_client = firestore.Client(
                    project=settings.firebase_project_id,
                    credentials=cred.get_credential()
                )
        return self._db_client

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

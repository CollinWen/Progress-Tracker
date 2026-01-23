"""
Google Drive service for storing and retrieving user data.
"""
import json
import logging
from typing import Dict, Optional, Tuple
from io import BytesIO

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials

from models.momentum import MomentumData, User
from config import settings

logger = logging.getLogger(__name__)

# Constants
MOMENTUM_FOLDER_NAME = "momentum"
DATA_FILE_NAME = "data.json"
MIME_TYPE_FOLDER = "application/vnd.google-apps.folder"
MIME_TYPE_JSON = "application/json"


class DriveService:
    """Handles Google Drive API operations for user data storage."""

    def __init__(self, access_token: str):
        """
        Initialize Drive service with user's access token.

        Args:
            access_token: Google OAuth access token
        """
        credentials = Credentials(token=access_token)
        self.service = build("drive", "v3", credentials=credentials)

    def _find_momentum_folder(self) -> Optional[str]:
        """
        Find the momentum folder in user's Drive.

        Returns:
            Folder ID or None if not found
        """
        try:
            query = f"name='{MOMENTUM_FOLDER_NAME}' and mimeType='{MIME_TYPE_FOLDER}' and trashed=false"
            results = (
                self.service.files()
                .list(q=query, spaces="drive", fields="files(id, name)")
                .execute()
            )

            files = results.get("files", [])
            if files:
                folder_id = files[0]["id"]
                logger.info(f"Found momentum folder: {folder_id}")
                return folder_id

            logger.info("Momentum folder not found")
            return None

        except HttpError as e:
            logger.error(f"Error finding momentum folder: {str(e)}")
            raise

    def _create_momentum_folder(self) -> str:
        """
        Create the momentum folder in user's Drive.

        Returns:
            Folder ID

        Raises:
            HttpError: If folder creation fails
        """
        try:
            file_metadata = {
                "name": MOMENTUM_FOLDER_NAME,
                "mimeType": MIME_TYPE_FOLDER,
            }

            folder = (
                self.service.files()
                .create(body=file_metadata, fields="id")
                .execute()
            )

            folder_id = folder.get("id")
            logger.info(f"Created momentum folder: {folder_id}")
            return folder_id

        except HttpError as e:
            logger.error(f"Error creating momentum folder: {str(e)}")
            raise

    def _find_data_file(self, folder_id: str) -> Optional[str]:
        """
        Find data.json file in momentum folder.

        Args:
            folder_id: Momentum folder ID

        Returns:
            File ID or None if not found
        """
        try:
            query = f"name='{DATA_FILE_NAME}' and '{folder_id}' in parents and trashed=false"
            results = (
                self.service.files()
                .list(q=query, spaces="drive", fields="files(id, name)")
                .execute()
            )

            files = results.get("files", [])
            if files:
                file_id = files[0]["id"]
                logger.info(f"Found data file: {file_id}")
                return file_id

            logger.info("Data file not found")
            return None

        except HttpError as e:
            logger.error(f"Error finding data file: {str(e)}")
            raise

    def _create_data_file(self, folder_id: str, initial_data: Dict) -> str:
        """
        Create data.json file in momentum folder.

        Args:
            folder_id: Momentum folder ID
            initial_data: Initial data structure

        Returns:
            File ID

        Raises:
            HttpError: If file creation fails
        """
        try:
            file_metadata = {
                "name": DATA_FILE_NAME,
                "parents": [folder_id],
                "mimeType": MIME_TYPE_JSON,
            }

            # Convert data to JSON bytes
            json_data = json.dumps(initial_data, indent=2)
            media = MediaIoBaseUpload(
                BytesIO(json_data.encode("utf-8")),
                mimetype=MIME_TYPE_JSON,
                resumable=True,
            )

            file = (
                self.service.files()
                .create(body=file_metadata, media_body=media, fields="id")
                .execute()
            )

            file_id = file.get("id")
            logger.info(f"Created data file: {file_id}")
            return file_id

        except HttpError as e:
            logger.error(f"Error creating data file: {str(e)}")
            raise

    async def initialize_user_storage(self, user_name: str) -> Tuple[str, MomentumData]:
        """
        Initialize user's Google Drive storage.
        Creates momentum folder and data.json if they don't exist.

        Args:
            user_name: User's name for initial data

        Returns:
            Tuple of (file_id, initial_data)

        Raises:
            HttpError: If Drive operations fail
        """
        try:
            # Find or create momentum folder
            folder_id = self._find_momentum_folder()
            if not folder_id:
                folder_id = self._create_momentum_folder()

            # Find or create data file
            file_id = self._find_data_file(folder_id)

            if file_id:
                # File exists, load existing data
                logger.info("Loading existing data file")
                data = await self.load_data(file_id)
                return file_id, data
            else:
                # Create new file with default data
                logger.info("Creating new data file with default structure")
                from datetime import datetime

                initial_data = {
                    "version": 1,
                    "user": {
                        "name": user_name,
                        "createdAt": datetime.utcnow().isoformat() + "Z",
                    },
                    "epics": [],
                    "logs": [],
                }

                file_id = self._create_data_file(folder_id, initial_data)
                momentum_data = MomentumData(**initial_data)
                return file_id, momentum_data

        except Exception as e:
            logger.error(f"Error initializing user storage: {str(e)}")
            raise

    async def load_data(self, file_id: str) -> MomentumData:
        """
        Load user data from Google Drive.

        Args:
            file_id: Google Drive file ID

        Returns:
            MomentumData object

        Raises:
            HttpError: If file download fails
            ValueError: If data is invalid
        """
        try:
            # Download file content
            request = self.service.files().get_media(fileId=file_id)
            file_stream = BytesIO()
            downloader = MediaIoBaseDownload(file_stream, request)

            done = False
            while not done:
                status, done = downloader.next_chunk()

            # Parse JSON
            file_stream.seek(0)
            data_dict = json.load(file_stream)

            # Validate and convert to Pydantic model
            momentum_data = MomentumData(**data_dict)

            logger.info(f"Loaded data from file {file_id}")
            return momentum_data

        except HttpError as e:
            if e.resp.status == 404:
                logger.error(f"File not found: {file_id}")
                raise ValueError("Data file not found")
            else:
                logger.error(f"Error loading data: {str(e)}")
                raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in data file: {str(e)}")
            raise ValueError("Data file contains invalid JSON")
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise ValueError(f"Failed to load data: {str(e)}")

    async def save_data(self, file_id: str, data: MomentumData) -> None:
        """
        Save user data to Google Drive (atomic update).

        Args:
            file_id: Google Drive file ID
            data: MomentumData to save

        Raises:
            HttpError: If file update fails
        """
        try:
            # Convert Pydantic model to dict, then to JSON
            data_dict = data.model_dump(by_alias=True)
            json_data = json.dumps(data_dict, indent=2)

            # Upload new content
            media = MediaIoBaseUpload(
                BytesIO(json_data.encode("utf-8")),
                mimetype=MIME_TYPE_JSON,
                resumable=True,
            )

            self.service.files().update(
                fileId=file_id,
                media_body=media,
            ).execute()

            logger.info(f"Saved data to file {file_id}")

        except HttpError as e:
            if e.resp.status == 404:
                logger.error(f"File not found: {file_id}")
                raise ValueError("Data file not found")
            else:
                logger.error(f"Error saving data: {str(e)}")
                raise
        except Exception as e:
            logger.error(f"Error saving data: {str(e)}")
            raise ValueError(f"Failed to save data: {str(e)}")

    async def delete_data_file(self, file_id: str) -> None:
        """
        Delete user's data file (move to trash).

        Args:
            file_id: Google Drive file ID

        Raises:
            HttpError: If deletion fails
        """
        try:
            self.service.files().update(fileId=file_id, body={"trashed": True}).execute()
            logger.info(f"Deleted (trashed) file {file_id}")

        except HttpError as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise

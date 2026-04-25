"""
Firestore service for managing user data with NoSQL document structure.

Collection Structure:
/users/{userId}
/users/{userId}/epics/{epicId}
/users/{userId}/epics/{epicId}/directives/{directiveId}
/users/{userId}/checkins/{checkinId}
/users/{userId}/epicStats/{epicId}  (optional aggregations)
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4
from google.cloud.firestore_v1 import FieldFilter

from services.firebase_service import firebase_service
from models.momentum import (
    Epic, Directive, Log, MomentumData, User,
    CreateEpicRequest, UpdateEpicRequest,
    CreateDirectiveRequest, UpdateDirectiveRequest,
    CreateLogRequest
)

logger = logging.getLogger(__name__)

# How many days of logs to fetch on initial load.
# The momentum graph shows 52 weeks; 365 days covers that with room to spare.
DEFAULT_LOG_DAYS = 365


class FirestoreService:
    """Service for Firestore data operations."""

    def __init__(self):
        self.db = firebase_service.db

    # ============================================================================
    # User Operations
    # ============================================================================

    async def get_or_create_user(self, user_id: str, email: str, name: str) -> User:
        """Get user document or create if doesn't exist."""
        user_ref = self.db.collection('users').document(user_id)
        user_doc = await asyncio.to_thread(user_ref.get)

        if user_doc.exists:
            return User(**user_doc.to_dict())

        user = User(
            name=name,
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        await asyncio.to_thread(user_ref.set, user.model_dump(by_alias=True))
        logger.info(f"Created new user: {user_id}")
        return user

    # ============================================================================
    # Epic Operations
    # ============================================================================

    async def get_epics(self, user_id: str) -> List[Epic]:
        """Get all epics for a user, with directives loaded in parallel."""
        epics_ref = self.db.collection('users').document(user_id).collection('epics')
        epic_docs = await asyncio.to_thread(lambda: list(epics_ref.stream()))

        async def _load_epic(doc):
            epic_data = doc.to_dict()
            directives = await self.get_directives(user_id, doc.id)
            epic_data['directives'] = [d.model_dump(by_alias=True) for d in directives]
            return Epic(**epic_data)

        return list(await asyncio.gather(*[_load_epic(doc) for doc in epic_docs]))

    async def get_epic(self, user_id: str, epic_id: str) -> Optional[Epic]:
        """Get a single epic by ID."""
        epic_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
        )
        epic_doc = await asyncio.to_thread(epic_ref.get)

        if not epic_doc.exists:
            return None

        epic_data = epic_doc.to_dict()
        directives = await self.get_directives(user_id, epic_id)
        epic_data['directives'] = [d.model_dump(by_alias=True) for d in directives]
        return Epic(**epic_data)

    async def create_epic(self, user_id: str, request: CreateEpicRequest) -> Epic:
        """Create a new epic."""
        epic_id = str(uuid4())
        epic = Epic(
            id=epic_id,
            name=request.name,
            color=request.color,
            description=request.description,
            checkin_interval=request.checkin_interval,
            created_at=datetime.now(timezone.utc).isoformat(),
            deadline=request.deadline,
            target=request.target,
            directives=[]
        )

        epic_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
        )
        await asyncio.to_thread(epic_ref.set, epic.model_dump(by_alias=True, exclude={'directives'}))
        logger.info(f"Created epic {epic_id} for user {user_id}")
        return epic

    async def update_epic(self, user_id: str, epic_id: str, request: UpdateEpicRequest) -> bool:
        """Update an epic."""
        epic_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
        )

        update_data = {}
        if request.name is not None:
            update_data['name'] = request.name
        if request.color is not None:
            update_data['color'] = request.color
        if request.description is not None:
            update_data['description'] = request.description
        if request.checkin_interval is not None:
            update_data['checkinInterval'] = request.checkin_interval
        if request.deadline is not None:
            update_data['deadline'] = request.deadline
        if request.target is not None:
            update_data['target'] = request.target.model_dump() if request.target else None

        if update_data:
            await asyncio.to_thread(epic_ref.update, update_data)
            logger.info(f"Updated epic {epic_id} for user {user_id}")
            return True

        return False

    async def delete_epic(self, user_id: str, epic_id: str) -> bool:
        """Delete an epic and all its directives and checkins."""
        # Fetch directives and checkins to delete concurrently
        directives_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
        )
        checkins_ref = self.db.collection('users').document(user_id).collection('checkins')
        checkins_query = checkins_ref.where(filter=FieldFilter('epicId', '==', epic_id))

        directive_docs, checkin_docs = await asyncio.gather(
            asyncio.to_thread(lambda: list(directives_ref.stream())),
            asyncio.to_thread(lambda: list(checkins_query.stream())),
        )

        delete_tasks = (
            [asyncio.to_thread(doc.reference.delete) for doc in directive_docs] +
            [asyncio.to_thread(doc.reference.delete) for doc in checkin_docs]
        )
        if delete_tasks:
            await asyncio.gather(*delete_tasks)

        epic_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
        )
        await asyncio.to_thread(epic_ref.delete)
        logger.info(f"Deleted epic {epic_id} for user {user_id}")
        return True

    # ============================================================================
    # Directive Operations
    # ============================================================================

    async def get_directives(self, user_id: str, epic_id: str) -> List[Directive]:
        """Get all directives for an epic."""
        directives_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
        )
        docs = await asyncio.to_thread(lambda: list(directives_ref.stream()))
        return [Directive(**doc.to_dict()) for doc in docs]

    async def create_directive(
        self, user_id: str, epic_id: str, request: CreateDirectiveRequest
    ) -> Directive:
        """Create a new directive."""
        directive_id = str(uuid4())
        directive = Directive(
            id=directive_id,
            name=request.name,
            type=request.type,
            progress_type=request.progress_type,
            is_complete=False,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        directive_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
            .document(directive_id)
        )
        await asyncio.to_thread(directive_ref.set, directive.model_dump(by_alias=True))
        logger.info(f"Created directive {directive_id} for epic {epic_id}")
        return directive

    async def update_directive(
        self, user_id: str, epic_id: str, directive_id: str, request: UpdateDirectiveRequest
    ) -> bool:
        """Update a directive."""
        directive_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
            .document(directive_id)
        )

        update_data = {}
        if request.name is not None:
            update_data['name'] = request.name
        if request.type is not None:
            update_data['type'] = request.type
        if request.progress_type is not None:
            update_data['progressType'] = request.progress_type
        if request.is_complete is not None:
            update_data['isComplete'] = request.is_complete

        if update_data:
            await asyncio.to_thread(directive_ref.update, update_data)
            logger.info(f"Updated directive {directive_id}")
            return True

        return False

    async def delete_directive(self, user_id: str, epic_id: str, directive_id: str) -> bool:
        """Delete a directive and its checkins."""
        checkins_ref = self.db.collection('users').document(user_id).collection('checkins')
        checkins_query = checkins_ref.where(filter=FieldFilter('directiveId', '==', directive_id))
        checkin_docs = await asyncio.to_thread(lambda: list(checkins_query.stream()))

        delete_tasks = [asyncio.to_thread(doc.reference.delete) for doc in checkin_docs]
        if delete_tasks:
            await asyncio.gather(*delete_tasks)

        directive_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
            .document(directive_id)
        )
        await asyncio.to_thread(directive_ref.delete)
        logger.info(f"Deleted directive {directive_id}")
        return True

    # ============================================================================
    # Check-in (Log) Operations
    # ============================================================================

    async def get_checkins(
        self,
        user_id: str,
        epic_id: Optional[str] = None,
        days: Optional[int] = DEFAULT_LOG_DAYS,
    ) -> List[Log]:
        """
        Get check-ins for a user.

        Args:
            user_id: Firebase user ID
            epic_id: Optional epic filter
            days: Only return logs from the last N days (None = no limit)
        """
        checkins_ref = self.db.collection('users').document(user_id).collection('checkins')
        query = checkins_ref

        if epic_id:
            query = query.where(filter=FieldFilter('epicId', '==', epic_id))

        if days is not None:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query = query.where(filter=FieldFilter('timestamp', '>=', cutoff))

        docs = await asyncio.to_thread(lambda: list(query.stream()))
        return [Log(**doc.to_dict()) for doc in docs]

    async def create_checkin(self, user_id: str, request: CreateLogRequest) -> Log:
        """Create a new check-in."""
        checkin_id = str(uuid4())
        checkin = Log(
            id=checkin_id,
            epic_id=request.epic_id,
            directive_id=request.directive_id,
            timestamp=request.timestamp or datetime.now(timezone.utc).isoformat(),
            duration_minutes=request.duration_minutes,
            session_type=request.session_type,
            note=request.note,
            source=request.source
        )

        checkin_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('checkins')
            .document(checkin_id)
        )
        await asyncio.to_thread(checkin_ref.set, checkin.model_dump(by_alias=True))
        logger.info(f"Created check-in {checkin_id} for user {user_id}")
        return checkin

    async def delete_checkin(self, user_id: str, checkin_id: str) -> bool:
        """Delete a check-in."""
        checkin_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('checkins')
            .document(checkin_id)
        )
        await asyncio.to_thread(checkin_ref.delete)
        logger.info(f"Deleted check-in {checkin_id}")
        return True

    # ============================================================================
    # Aggregate Data Operations (for compatibility with existing API)
    # ============================================================================

    async def get_all_data(self, user_id: str) -> MomentumData:
        """
        Get all user data in the legacy MomentumData format.
        Epics (with directives) and recent logs are fetched concurrently.
        """
        user, epics, checkins = await asyncio.gather(
            self.get_or_create_user(user_id, "", ""),
            self.get_epics(user_id),
            self.get_checkins(user_id),  # limited to last 365 days by default
        )

        return MomentumData(
            version=1,
            user=user,
            epics=epics,
            logs=checkins
        )


# Global service instance
firestore_service = FirestoreService()

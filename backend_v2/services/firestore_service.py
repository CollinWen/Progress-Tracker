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
from google.cloud.firestore_v1 import FieldFilter, ArrayUnion

import hashlib
import secrets

from services.firebase_service import firebase_service
from models.momentum import (
    Epic, Directive, Log, MomentumData, User,
    CreateEpicRequest, UpdateEpicRequest,
    CreateDirectiveRequest, UpdateDirectiveRequest,
    CreateLogRequest,
    AgentMeta, AgentLogEntry, AgentStatus,
    CreateAgentDirectiveRequest,
    Run, UpdateRunRequest,
    ApiKey, CreateApiKeyResponse,
)

logger = logging.getLogger(__name__)

# How many days of logs to fetch on initial load.
# The momentum graph shows 52 weeks; 365 days covers that with room to spare.
DEFAULT_LOG_DAYS = 365

# How many days of check-in history to include when building agent context for an epic.
AGENT_CONTEXT_LOG_DAYS = 90

# Maps an agent skill to the closest human-facing activity type, so agent-created
# directives still render correctly in the existing UI.
SKILL_TO_ACTIVITY = {
    "research": "research",
    "code": "build",
    "email": "arrange",
    "schedule": "arrange",
    "logistics": "plan",
    "brainstorm": "plan",
}


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
        if request.resources is not None:
            update_data['resources'] = request.resources.model_dump(by_alias=True)
        if request.schedule is not None:
            update_data['schedule'] = request.schedule.model_dump(by_alias=True)

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
    # Agent Orchestrator Operations
    #
    # These power the autonomous orchestrator (a separate client of Momentum that
    # reaches Momentum via the MCP server). They never mutate human-facing fields.
    # ============================================================================

    async def get_active_epics(self, user_id: str) -> List[Epic]:
        """
        Epics the orchestrator should consider. Epics have no stored status field
        (the UI computes a derived 'phase'), so for now this returns all epics.
        Filtering (e.g. excluding paused workstreams) can be layered on later.
        """
        return await self.get_epics(user_id)

    async def get_epic_context(self, user_id: str, epic_id: str) -> Optional[dict]:
        """
        Assemble everything an agent needs to act on a directive in this epic:
        the epic (with directives, resources, and agent_log) plus recent human
        check-in history. Returns a JSON-serializable dict, or None if not found.
        """
        epic = await self.get_epic(user_id, epic_id)
        if epic is None:
            return None

        recent_logs = await self.get_checkins(user_id, epic_id, days=AGENT_CONTEXT_LOG_DAYS)
        return {
            "epic": epic.model_dump(by_alias=True),
            "recent_logs": [log.model_dump(by_alias=True) for log in recent_logs],
        }

    async def get_pending_agent_directives(
        self, user_id: str, epic_id: Optional[str] = None
    ) -> List[dict]:
        """
        Return all directives whose agent status is 'queued', each paired with its
        epic id. Filtered in Python since the agent map lives on directive docs
        spread across per-epic subcollections.
        """
        epics = [await self.get_epic(user_id, epic_id)] if epic_id else await self.get_epics(user_id)

        pending: List[dict] = []
        for epic in epics:
            if epic is None:
                continue
            for directive in epic.directives:
                if directive.agent and directive.agent.status == "queued":
                    pending.append({
                        "epic_id": epic.id,
                        "directive": directive.model_dump(by_alias=True),
                    })
        return pending

    def _directive_ref(self, user_id: str, epic_id: str, directive_id: str):
        return (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
            .collection('directives')
            .document(directive_id)
        )

    async def set_agent_status(
        self,
        user_id: str,
        epic_id: str,
        directive_id: str,
        new_status: AgentStatus,
        error: Optional[str] = None,
    ) -> bool:
        """Transition a directive's agent.status (dotted-path update, append-safe)."""
        update_data = {
            'agent.status': new_status,
            'agent.updatedAt': datetime.now(timezone.utc).isoformat(),
            'agent.error': error,  # None clears any prior error on success transitions
        }
        await asyncio.to_thread(
            self._directive_ref(user_id, epic_id, directive_id).update, update_data
        )
        logger.info(f"Set agent status of directive {directive_id} -> {new_status}")
        return True

    async def write_agent_result(
        self,
        user_id: str,
        epic_id: str,
        directive_id: str,
        result: object,
        result_ref: Optional[str] = None,
    ) -> bool:
        """Write the agent's structured result payload back onto the directive."""
        update_data = {
            'agent.result': result,
            'agent.resultRef': result_ref,
            'agent.updatedAt': datetime.now(timezone.utc).isoformat(),
        }
        await asyncio.to_thread(
            self._directive_ref(user_id, epic_id, directive_id).update, update_data
        )
        logger.info(f"Wrote agent result for directive {directive_id}")
        return True

    async def append_agent_log(self, user_id: str, epic_id: str, entry: AgentLogEntry) -> bool:
        """
        Append (never edit) an entry to the epic's agent_log. ArrayUnion creates the
        field if it doesn't yet exist, preserving the append-only audit guarantee.
        """
        epic_ref = (
            self.db.collection('users')
            .document(user_id)
            .collection('epics')
            .document(epic_id)
        )
        await asyncio.to_thread(
            epic_ref.update, {'agentLog': ArrayUnion([entry.model_dump(by_alias=True)])}
        )
        logger.info(f"Appended agent_log entry to epic {epic_id}")
        return True

    async def create_agent_directive(
        self, user_id: str, epic_id: str, request: CreateAgentDirectiveRequest
    ) -> Directive:
        """
        Create a new agent-actionable directive (used by the brainstorm skill and
        any agent that surfaces follow-up work). The new directive carries an agent
        block in 'queued' state and a human activity type mapped from its skill.
        """
        directive_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        directive = Directive(
            id=directive_id,
            name=request.name,
            type=SKILL_TO_ACTIVITY.get(request.skill, "plan"),
            progress_type="task",
            is_complete=False,
            created_at=now,
            agent=AgentMeta(
                skill=request.skill,
                brief=request.brief,
                status="queued",
                created_by=request.created_by,
                updated_at=now,
            ),
        )
        await asyncio.to_thread(
            self._directive_ref(user_id, epic_id, directive_id).set,
            directive.model_dump(by_alias=True),
        )
        logger.info(
            f"Created agent directive {directive_id} (skill={request.skill}, "
            f"by={request.created_by}) for epic {epic_id}"
        )
        return directive

    async def count_agent_directives_created_today(self, user_id: str, epic_id: str) -> int:
        """
        Count directives created by the agent in this epic since UTC midnight.
        Used to enforce the 'max 3 new agent-created directives per epic per day'
        guardrail before the brainstorm skill writes new work.
        """
        epic = await self.get_epic(user_id, epic_id)
        if epic is None:
            return 0
        today = datetime.now(timezone.utc).date().isoformat()
        return sum(
            1 for d in epic.directives
            if d.agent and d.agent.created_by == "agent" and d.created_at.startswith(today)
        )

    # ============================================================================
    # Run Operations (history of orchestrator executions)
    # ============================================================================

    def _runs_ref(self, user_id: str):
        return self.db.collection('users').document(user_id).collection('runs')

    async def create_run(self, user_id: str, epic_id: str, trigger: str = "manual") -> Run:
        """Open a new run record in 'running' state."""
        run_id = str(uuid4())
        run = Run(
            id=run_id,
            epic_id=epic_id,
            trigger=trigger,
            status="running",
            started_at=datetime.now(timezone.utc).isoformat(),
        )
        await asyncio.to_thread(
            self._runs_ref(user_id).document(run_id).set, run.model_dump(by_alias=True)
        )
        logger.info(f"Opened run {run_id} for epic {epic_id} (trigger={trigger})")
        return run

    async def update_run(self, user_id: str, run_id: str, request: UpdateRunRequest) -> bool:
        """Update / finalize a run record."""
        update_data: dict = {}
        if request.status is not None:
            update_data['status'] = request.status
        if request.finished_at is not None:
            update_data['finishedAt'] = request.finished_at
        if request.items is not None:
            update_data['items'] = [i.model_dump(by_alias=True) for i in request.items]
        if request.created_directive_ids is not None:
            update_data['createdDirectiveIds'] = request.created_directive_ids
        if request.error is not None:
            update_data['error'] = request.error

        if not update_data:
            return False
        await asyncio.to_thread(self._runs_ref(user_id).document(run_id).update, update_data)
        logger.info(f"Updated run {run_id}")
        return True

    async def get_runs(
        self, user_id: str, epic_id: Optional[str] = None, limit: int = 50
    ) -> List[Run]:
        """List runs for the user, newest first, optionally scoped to one epic."""
        query = self._runs_ref(user_id)
        if epic_id:
            query = query.where(filter=FieldFilter('epicId', '==', epic_id))
        docs = await asyncio.to_thread(lambda: list(query.stream()))
        runs = [Run(**doc.to_dict()) for doc in docs]
        runs.sort(key=lambda r: r.started_at, reverse=True)
        return runs[:limit]

    async def update_epic_schedule_run_times(
        self, user_id: str, epic_id: str, last_run_at: Optional[str], next_run_at: Optional[str]
    ) -> bool:
        """Persist the scheduler's bookkeeping (last/next run) onto the epic schedule."""
        update_data = {}
        if last_run_at is not None:
            update_data['schedule.lastRunAt'] = last_run_at
        if next_run_at is not None:
            update_data['schedule.nextRunAt'] = next_run_at
        if not update_data:
            return False
        epic_ref = (
            self.db.collection('users').document(user_id).collection('epics').document(epic_id)
        )
        await asyncio.to_thread(epic_ref.update, update_data)
        return True

    # ============================================================================
    # API Key Operations
    # ============================================================================

    def _key_hash(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()

    async def create_api_key(self, user_id: str, name: str) -> CreateApiKeyResponse:
        """Generate a new API key, store its hash, return the plaintext key once."""
        key = "mom_" + secrets.token_urlsafe(32)
        key_hash = self._key_hash(key)
        key_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "keyId": key_id,
            "userId": user_id,
            "name": name,
            "createdAt": now,
            "lastUsedAt": None,
        }
        await asyncio.to_thread(
            self.db.collection("api_keys").document(key_hash).set, doc
        )
        logger.info(f"Created API key {key_id} for user {user_id}")
        return CreateApiKeyResponse(
            key_id=key_id, name=name, key=key, created_at=now
        )

    async def lookup_api_key(self, key: str) -> Optional[str]:
        """Return the user_id for a valid API key, or None if not found. Updates lastUsedAt."""
        key_hash = self._key_hash(key)
        doc_ref = self.db.collection("api_keys").document(key_hash)
        doc = await asyncio.to_thread(doc_ref.get)
        if not doc.exists:
            return None
        data = doc.to_dict()
        now = datetime.now(timezone.utc).isoformat()
        await asyncio.to_thread(doc_ref.update, {"lastUsedAt": now})
        return data.get("userId")

    async def list_api_keys(self, user_id: str) -> List[ApiKey]:
        """List all API keys for a user (key hash and plaintext are never returned)."""
        query = self.db.collection("api_keys").where(
            filter=FieldFilter("userId", "==", user_id)
        )
        docs = await asyncio.to_thread(lambda: list(query.stream()))
        keys = []
        for doc in docs:
            data = doc.to_dict()
            keys.append(ApiKey(
                key_id=data["keyId"],
                name=data["name"],
                created_at=data["createdAt"],
                last_used_at=data.get("lastUsedAt"),
            ))
        keys.sort(key=lambda k: k.created_at, reverse=True)
        return keys

    async def revoke_api_key(self, user_id: str, key_id: str) -> bool:
        """Delete an API key by key_id, ensuring it belongs to the requesting user."""
        query = (
            self.db.collection("api_keys")
            .where(filter=FieldFilter("userId", "==", user_id))
            .where(filter=FieldFilter("keyId", "==", key_id))
            .limit(1)
        )
        docs = await asyncio.to_thread(lambda: list(query.stream()))
        if not docs:
            return False
        await asyncio.to_thread(docs[0].reference.delete)
        logger.info(f"Revoked API key {key_id} for user {user_id}")
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

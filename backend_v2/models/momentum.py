"""
Pydantic models for Momentum data structures.
These mirror the TypeScript types defined in shared/types/momentum.types.ts
"""
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Literal, Any
from datetime import datetime


# Type aliases matching TypeScript types
ActivityType = Literal["build", "learn", "train", "research", "plan", "arrange"]
Phase = Literal["exploring", "building", "active", "refining", "paused"]
CheckinInterval = Literal["daily", "weekly", "biweekly", "monthly"]
LogSource = Literal["manual", "voice", "text", "call"]
SessionType = Literal["quick", "blocked", "deep"]
DirectiveProgressType = Literal["task", "ongoing"]  # task = incomplete/complete, ongoing = inactive/active

# ── Agent orchestrator types ──
# These power the autonomous orchestrator (a separate client of Momentum). They are
# purely additive: human-facing fields (type/progressType/isComplete) are untouched.
AgentSkill = Literal["research", "code", "email", "schedule", "logistics", "brainstorm"]
AgentStatus = Literal["queued", "running", "done", "failed", "needs_review"]
CreatedBy = Literal["user", "agent"]

# A "run" is one execution of the orchestrator against an epic. Trigger records how
# it started; status tracks the batch lifecycle.
RunTrigger = Literal["manual", "scheduled"]
RunStatus = Literal["running", "completed", "failed"]


class User(BaseModel):
    """User information."""
    name: str
    created_at: str = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class Target(BaseModel):
    """Target progress for an epic."""
    current: int
    total: int
    unit: str  # e.g., "races", "books", "projects"


class Attachment(BaseModel):
    """Attachment (link, photo, or file) for an epic."""
    id: str
    type: Literal["link", "photo", "file"]
    url: str
    name: str
    thumbnail: Optional[str] = None
    created_at: str = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class AgentMeta(BaseModel):
    """
    The agent dimension of a directive. Present only on directives the orchestrator
    should act on; None on purely human directives. Lives alongside (not instead of)
    the human fields, so the existing UI is unaffected.
    """
    skill: AgentSkill                                      # routing key: which skill handles this
    brief: str                                             # the instruction/goal for the agent
    status: AgentStatus = "queued"                         # processing lifecycle
    created_by: CreatedBy = Field(default="user", alias="createdBy")
    result: Optional[Any] = None                           # structured payload written on completion
    result_ref: Optional[str] = Field(default=None, alias="resultRef")  # pointer to full artifact
    error: Optional[str] = None                            # failure message, if status == failed
    updated_at: Optional[str] = Field(default=None, alias="updatedAt")

    class Config:
        populate_by_name = True


class Directive(BaseModel):
    """A recurring activity within an epic."""
    id: str
    name: str
    type: ActivityType
    created_at: str = Field(alias="createdAt")
    progress_type: DirectiveProgressType = Field(default="ongoing", alias="progressType")
    is_complete: bool = Field(default=False, alias="isComplete")  # Only relevant for progressType="task"
    attachments: Optional[List[Attachment]] = None
    order: Optional[int] = None  # For custom ordering
    agent: Optional[AgentMeta] = None  # Agent orchestrator metadata (None = human-only directive)

    class Config:
        populate_by_name = True


class EpicResources(BaseModel):
    """Tools, skills, and reference material the agent may use for this workstream."""
    mcps: List[str] = Field(default_factory=list)            # e.g. ["github", "google-calendar"]
    skills: List[str] = Field(default_factory=list)          # e.g. ["research", "code"]
    context_urls: List[str] = Field(default_factory=list, alias="contextUrls")

    class Config:
        populate_by_name = True


class AgentLogEntry(BaseModel):
    """A single append-only entry in an epic's agent activity log."""
    timestamp: str
    directive_id: str = Field(alias="directiveId")
    skill: str
    summary: str
    result_ref: Optional[str] = Field(default=None, alias="resultRef")

    class Config:
        populate_by_name = True


class EpicSchedule(BaseModel):
    """
    A recurring schedule that drives the orchestrator to run this epic's queued
    directives automatically. Executed by the local scheduler daemon, which honors
    the cron expression and updates last_run_at / next_run_at.
    """
    enabled: bool = False
    cron: str = "0 9 * * *"            # default: daily at 09:00
    timezone: str = "UTC"
    last_run_at: Optional[str] = Field(default=None, alias="lastRunAt")
    next_run_at: Optional[str] = Field(default=None, alias="nextRunAt")

    class Config:
        populate_by_name = True


class Epic(BaseModel):
    """A large, overarching goal."""
    id: str
    uuid: Optional[str] = None
    name: str
    color: str
    description: str
    checkin_interval: CheckinInterval = Field(alias="checkinInterval")
    created_at: str = Field(alias="createdAt")
    deadline: Optional[str] = None
    target: Optional[Target] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[Attachment]] = None
    notes: Optional[str] = None
    directives: List[Directive]
    order: Optional[int] = None  # For custom ordering
    resources: Optional[EpicResources] = None  # Agent tools/skills/context for this workstream
    agent_log: List[AgentLogEntry] = Field(default_factory=list, alias="agentLog")  # Append-only audit
    schedule: Optional[EpicSchedule] = None  # Recurring orchestrator schedule for this epic

    @model_validator(mode='before')
    @classmethod
    def migrate_emoji_to_color(cls, data: Any) -> Any:
        """Backward compatibility: convert 'emoji' field to 'color' if needed."""
        if isinstance(data, dict):
            if 'emoji' in data and 'color' not in data:
                data['color'] = data['emoji']
        return data

    class Config:
        populate_by_name = True


class Log(BaseModel):
    """Individual check-in entry."""
    id: str
    epic_id: str = Field(alias="epicId")
    directive_id: str = Field(alias="directiveId")
    timestamp: str
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
    session_type: Optional[SessionType] = Field(None, alias="sessionType")  # quick, blocked, or deep
    note: str
    source: LogSource

    class Config:
        populate_by_name = True


class MomentumData(BaseModel):
    """Complete user data structure stored in Google Drive."""
    version: int
    user: User
    epics: List[Epic]
    logs: List[Log]

    class Config:
        populate_by_name = True


# ============================================================================
# Agent Run models (history of orchestrator executions)
# ============================================================================


class RunArtifact(BaseModel):
    """A concrete thing a run produced — a commit, a URL, a drafted email, etc."""
    type: str                          # commit | url | draft | directive | other
    ref: str                           # the identifier (sha, url, draft id, directive id)
    label: Optional[str] = None        # human-readable label

    class Config:
        populate_by_name = True


class RunItem(BaseModel):
    """One directive processed within a run."""
    directive_id: str = Field(alias="directiveId")
    skill: str
    status: str                        # done | failed | needs_review
    summary: Optional[str] = None
    result_ref: Optional[str] = Field(default=None, alias="resultRef")
    artifacts: List[RunArtifact] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class Run(BaseModel):
    """One execution of the orchestrator against an epic."""
    id: str
    epic_id: str = Field(alias="epicId")
    trigger: RunTrigger = "manual"
    status: RunStatus = "running"
    started_at: str = Field(alias="startedAt")
    finished_at: Optional[str] = Field(default=None, alias="finishedAt")
    items: List[RunItem] = Field(default_factory=list)
    created_directive_ids: List[str] = Field(default_factory=list, alias="createdDirectiveIds")
    error: Optional[str] = None

    class Config:
        populate_by_name = True


# Request/Response models for API endpoints

class CreateEpicRequest(BaseModel):
    """Request to create a new epic."""
    uuid: Optional[str] = None
    name: str
    color: str
    description: str
    checkin_interval: CheckinInterval = Field(default="weekly", alias="checkinInterval")
    deadline: Optional[str] = None
    target: Optional[Target] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[Attachment]] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class UpdateEpicRequest(BaseModel):
    """Request to update an epic."""
    uuid: Optional[str] = None
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    checkin_interval: Optional[CheckinInterval] = Field(None, alias="checkinInterval")
    deadline: Optional[str] = None
    target: Optional[Target] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[Attachment]] = None
    notes: Optional[str] = None
    order: Optional[int] = None
    resources: Optional[EpicResources] = None
    schedule: Optional[EpicSchedule] = None

    class Config:
        populate_by_name = True


class CreateDirectiveRequest(BaseModel):
    """Request to create a new directive."""
    name: str
    type: ActivityType
    progress_type: DirectiveProgressType = Field(default="ongoing", alias="progressType")
    attachments: Optional[List[Attachment]] = None

    class Config:
        populate_by_name = True


class UpdateDirectiveRequest(BaseModel):
    """Request to update a directive."""
    name: Optional[str] = None
    type: Optional[ActivityType] = None
    progress_type: Optional[DirectiveProgressType] = Field(None, alias="progressType")
    is_complete: Optional[bool] = Field(None, alias="isComplete")
    attachments: Optional[List[Attachment]] = None
    order: Optional[int] = None

    class Config:
        populate_by_name = True


class CreateLogRequest(BaseModel):
    """Request to create a new log entry."""
    epic_id: str = Field(alias="epicId")
    directive_id: str = Field(alias="directiveId")
    timestamp: Optional[str] = None  # ISO datetime, defaults to now
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
    session_type: Optional[SessionType] = Field(None, alias="sessionType")
    note: str
    source: LogSource = "manual"

    class Config:
        populate_by_name = True


# ============================================================================
# Agent Orchestrator Request models
# ============================================================================


class CreateAgentDirectiveRequest(BaseModel):
    """Request to create a new agent-actionable directive (used by create_directive MCP verb)."""
    skill: AgentSkill
    name: str
    brief: str
    created_by: CreatedBy = Field(default="agent", alias="createdBy")

    class Config:
        populate_by_name = True


class SetAgentStatusRequest(BaseModel):
    """Request to transition a directive's agent status."""
    status: AgentStatus
    error: Optional[str] = None

    class Config:
        populate_by_name = True


class WriteAgentResultRequest(BaseModel):
    """Request to write an agent result back to a directive."""
    result: Any
    result_ref: Optional[str] = Field(default=None, alias="resultRef")

    class Config:
        populate_by_name = True


class CreateRunRequest(BaseModel):
    """Request to open a new run record."""
    epic_id: str = Field(alias="epicId")
    trigger: RunTrigger = "manual"

    class Config:
        populate_by_name = True


class UpdateRunRequest(BaseModel):
    """Request to update / finalize a run record."""
    status: Optional[RunStatus] = None
    finished_at: Optional[str] = Field(default=None, alias="finishedAt")
    items: Optional[List[RunItem]] = None
    created_directive_ids: Optional[List[str]] = Field(default=None, alias="createdDirectiveIds")
    error: Optional[str] = None

    class Config:
        populate_by_name = True

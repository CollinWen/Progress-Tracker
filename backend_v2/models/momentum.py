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

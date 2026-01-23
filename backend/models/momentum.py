"""
Pydantic models for Momentum data structures.
These mirror the TypeScript types defined in shared/types/momentum.types.ts
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


# Type aliases matching TypeScript types
ActivityType = Literal["build", "learn", "train", "research", "plan", "arrange"]
Phase = Literal["exploring", "building", "active", "refining", "paused"]
CheckinInterval = Literal["daily", "weekly", "biweekly", "monthly"]
LogSource = Literal["manual", "voice", "text", "call"]


class User(BaseModel):
    """User information."""
    name: str
    created_at: str = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class Directive(BaseModel):
    """A recurring activity within an epic."""
    id: str
    name: str
    type: ActivityType
    interval: CheckinInterval
    created_at: str = Field(alias="createdAt")

    class Config:
        populate_by_name = True


class Target(BaseModel):
    """Target progress for an epic."""
    current: int
    total: int
    unit: str  # e.g., "races", "books", "projects"


class Epic(BaseModel):
    """A large, overarching goal."""
    id: str
    name: str
    emoji: str
    description: str
    phase: Phase
    created_at: str = Field(alias="createdAt")
    deadline: Optional[str] = None
    target: Optional[Target] = None
    directives: List[Directive]

    class Config:
        populate_by_name = True


class Log(BaseModel):
    """Individual check-in entry."""
    id: str
    epic_id: str = Field(alias="epicId")
    directive_id: str = Field(alias="directiveId")
    timestamp: str
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
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
    name: str
    emoji: str
    description: str
    phase: Phase = "exploring"
    deadline: Optional[str] = None
    target: Optional[Target] = None


class UpdateEpicRequest(BaseModel):
    """Request to update an epic."""
    name: Optional[str] = None
    emoji: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[Phase] = None
    deadline: Optional[str] = None
    target: Optional[Target] = None


class CreateDirectiveRequest(BaseModel):
    """Request to create a new directive."""
    name: str
    type: ActivityType
    interval: CheckinInterval


class UpdateDirectiveRequest(BaseModel):
    """Request to update a directive."""
    name: Optional[str] = None
    type: Optional[ActivityType] = None
    interval: Optional[CheckinInterval] = None


class CreateLogRequest(BaseModel):
    """Request to create a new log entry."""
    epic_id: str = Field(alias="epicId")
    directive_id: str = Field(alias="directiveId")
    timestamp: Optional[str] = None  # ISO datetime, defaults to now
    duration_minutes: Optional[int] = Field(None, alias="durationMinutes")
    note: str
    source: LogSource = "manual"

    class Config:
        populate_by_name = True

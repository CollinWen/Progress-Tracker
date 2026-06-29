"""
Momentum MCP server — the contract between Momentum (data + UI, source of truth)
and its agent clients (the autonomous orchestrator, or an interactive Claude session).

It exposes a small set of verbs over MCP (streamable-HTTP transport) and is a thin
wrapper over the existing ``firestore_service`` — so the MCP and the REST API share one
data layer and can never drift. It is mounted into the FastAPI app at ``/mcp`` and
deployed alongside the API.

Auth model
----------
The endpoint is gated by a static bearer token (``_BearerAuthASGI``); any request
without the right token gets a 401. On success it operates as a single configured user:

    ORCHESTRATOR_TOKEN     the shared secret the local orchestrator sends
    ORCHESTRATOR_USER_ID   the Firebase UID the orchestrator acts as

Firebase Admin credentials live only on the deployed backend (never on the local box).
The local orchestrator holds only ORCHESTRATOR_TOKEN. See main.py for the mount + the
session-manager lifespan wiring.

Verbs
-----
    get_active_epics()
    get_epic_context(epic_id)
    get_pending_directives(epic_id?)
    set_directive_status(epic_id, directive_id, status, error?)
    write_directive_result(epic_id, directive_id, result, result_ref?)
    append_agent_log(epic_id, directive_id, skill, summary, result_ref?)
    create_directive(epic_id, skill, name, brief, created_by?)
"""
import hmac
import os
import sys
from datetime import datetime, timezone
from typing import Any, Optional

# Allow `python mcp_server/server.py` as well as `python -m mcp_server.server`
# by ensuring backend_v2 (this file's parent's parent) is importable.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from mcp.server.fastmcp import FastMCP

from config import settings
from services.firestore_service import firestore_service
from models.momentum import (
    AgentLogEntry,
    CreateAgentDirectiveRequest,
    UpdateRunRequest,
    RunItem,
)
from skills_catalog import get_catalog

# Max new agent-created directives per epic per day. Enforced at the contract layer so
# the guardrail holds no matter which client/skill calls create_directive.
MAX_AGENT_DIRECTIVES_PER_DAY = 3

# Streamable-HTTP, stateless (Cloud Run instances aren't sticky). The endpoint is
# mounted into the FastAPI app at /mcp; streamable_http_path="/" so the mounted path
# is exactly /mcp (not /mcp/mcp).
mcp = FastMCP("momentum", stateless_http=True, streamable_http_path="/")


def _user_id() -> str:
    """
    The user the orchestrator operates as. Identity is established by the bearer-token
    gate in front of /mcp (see auth_middleware); this maps to a single configured user.
    Multi-user later = a token->uid lookup + per-request context.
    """
    user_id = settings.orchestrator_user_id
    if not user_id:
        raise RuntimeError("ORCHESTRATOR_USER_ID is not set on the backend.")
    return user_id


@mcp.tool()
async def get_active_epics() -> list[dict]:
    """List the user's active epics (workstreams), each with its directives, resources,
    and agent_log. Use this to discover what workstreams exist before drilling into one."""
    epics = await firestore_service.get_active_epics(_user_id())
    return [e.model_dump(by_alias=True) for e in epics]


@mcp.tool()
async def get_epic_context(epic_id: str) -> dict:
    """Get the full working context for one epic: the epic itself (name, description,
    notes, deadline, target, tags, resources, agent_log), all its directives, and the
    user's recent check-in history. This is the context you should ground any agent
    action on. Returns an error dict if the epic does not exist."""
    context = await firestore_service.get_epic_context(_user_id(), epic_id)
    if context is None:
        return {"error": f"Epic {epic_id} not found"}
    return context


@mcp.tool()
async def get_pending_directives(epic_id: Optional[str] = None) -> list[dict]:
    """List directives whose agent status is 'queued' and are ready to be worked.
    Pass epic_id to scope to one epic, or omit it to get queued work across all epics.
    Each item is {epic_id, directive}."""
    return await firestore_service.get_pending_agent_directives(_user_id(), epic_id)


@mcp.tool()
async def set_directive_status(
    epic_id: str,
    directive_id: str,
    status: str,
    error: Optional[str] = None,
) -> dict:
    """Transition a directive's agent processing status. Valid values:
    queued | running | done | failed | needs_review. Pass `error` when moving to
    'failed'. Every transition is persisted, giving a full audit trail."""
    valid = {"queued", "running", "done", "failed", "needs_review"}
    if status not in valid:
        return {"error": f"Invalid status '{status}'. Must be one of {sorted(valid)}."}
    await firestore_service.set_agent_status(_user_id(), epic_id, directive_id, status, error)
    return {"ok": True, "directive_id": directive_id, "status": status}


@mcp.tool()
async def write_directive_result(
    epic_id: str,
    directive_id: str,
    result: Any,
    result_ref: Optional[str] = None,
) -> dict:
    """Write the agent's structured result payload back onto a directive. `result` is
    a JSON object (e.g. a research summary with sources); `result_ref` optionally points
    to a fuller artifact. Does not change status — call set_directive_status separately."""
    await firestore_service.write_agent_result(
        _user_id(), epic_id, directive_id, result, result_ref
    )
    return {"ok": True, "directive_id": directive_id}


@mcp.tool()
async def append_agent_log(
    epic_id: str,
    directive_id: str,
    skill: str,
    summary: str,
    result_ref: Optional[str] = None,
) -> dict:
    """Append an entry to an epic's append-only agent activity log. Call this after
    completing work on a directive so the audit trail and the daily digest stay
    accurate. Entries are never edited or removed."""
    entry = AgentLogEntry(
        timestamp=datetime.now(timezone.utc).isoformat(),
        directive_id=directive_id,
        skill=skill,
        summary=summary,
        result_ref=result_ref,
    )
    await firestore_service.append_agent_log(_user_id(), epic_id, entry)
    return {"ok": True, "epic_id": epic_id}


@mcp.tool()
async def create_directive(
    epic_id: str,
    skill: str,
    name: str,
    brief: str,
    created_by: str = "agent",
) -> dict:
    """Create a new agent-actionable directive in 'queued' state. `skill` is the routing
    key (research | code | email | schedule | logistics | brainstorm), `name` is the short
    human-readable title, and `brief` is the instruction/goal the agent will act on.

    Guardrail: when created_by == 'agent', no more than 3 agent-created directives may be
    added to a single epic per day; further attempts return an error instead of writing."""
    valid_skills = {"research", "code", "email", "schedule", "logistics", "brainstorm"}
    if skill not in valid_skills:
        return {"error": f"Invalid skill '{skill}'. Must be one of {sorted(valid_skills)}."}

    user_id = _user_id()
    if created_by == "agent":
        count = await firestore_service.count_agent_directives_created_today(user_id, epic_id)
        if count >= MAX_AGENT_DIRECTIVES_PER_DAY:
            return {
                "error": (
                    f"Daily limit reached: {count}/{MAX_AGENT_DIRECTIVES_PER_DAY} "
                    f"agent-created directives already added to epic {epic_id} today."
                )
            }

    request = CreateAgentDirectiveRequest(
        skill=skill, name=name, brief=brief, created_by=created_by
    )
    directive = await firestore_service.create_agent_directive(user_id, epic_id, request)
    return {"ok": True, "directive": directive.model_dump(by_alias=True)}


@mcp.tool()
async def list_skills() -> list[dict]:
    """The catalog of agent skills: name, description, whether each requires review,
    whether it creates new directives, required MCPs, and whether it's available yet.
    Use this to understand what kinds of work can be routed."""
    return get_catalog()


@mcp.tool()
async def create_run(epic_id: str, trigger: str = "manual") -> dict:
    """Open a run record for an epic before processing its directives. `trigger` is
    'manual' or 'scheduled'. Returns the run (use its id to finalize with update_run)."""
    run = await firestore_service.create_run(_user_id(), epic_id, trigger)
    return {"ok": True, "run": run.model_dump(by_alias=True)}


@mcp.tool()
async def update_run(
    run_id: str,
    status: Optional[str] = None,
    finished_at: Optional[str] = None,
    items: Optional[list] = None,
    created_directive_ids: Optional[list] = None,
    error: Optional[str] = None,
) -> dict:
    """Update or finalize a run. `status` is running|completed|failed. `items` is a
    list of per-directive results: {directiveId, skill, status, summary, resultRef,
    artifacts:[{type, ref, label}]}. `created_directive_ids` lists any new directives
    the agent surfaced this run."""
    parsed_items = [RunItem(**i) for i in items] if items is not None else None
    request = UpdateRunRequest(
        status=status,
        finished_at=finished_at,
        items=parsed_items,
        created_directive_ids=created_directive_ids,
        error=error,
    )
    await firestore_service.update_run(_user_id(), run_id, request)
    return {"ok": True, "run_id": run_id}


@mcp.tool()
async def set_schedule_run_times(
    epic_id: str, last_run_at: Optional[str] = None, next_run_at: Optional[str] = None
) -> dict:
    """Record the scheduler's bookkeeping on an epic's schedule: the timestamp of the
    last run and the computed next run. Used by the local scheduler daemon."""
    await firestore_service.update_epic_schedule_run_times(
        _user_id(), epic_id, last_run_at, next_run_at
    )
    return {"ok": True, "epic_id": epic_id}


# ASGI app for the streamable-HTTP MCP endpoint. main.py mounts `authed_mcp_app` at
# /mcp and wires mcp.session_manager into the FastAPI lifespan.
mcp_app = mcp.streamable_http_app()


class _BearerAuthASGI:
    """
    Gate every request to the MCP endpoint behind a static bearer token. Missing or
    wrong token -> 401, so there are no unauthenticated requests. Identity is constant
    (the single configured user); see _user_id(). Non-HTTP scopes pass through.
    """
    def __init__(self, app, token: str):
        self.app = app
        self.token = token

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        provided = headers.get(b"authorization", b"").decode()
        expected = f"Bearer {self.token}" if self.token else ""

        if not self.token or not hmac.compare_digest(provided, expected):
            await send({
                "type": "http.response.start",
                "status": 401,
                "headers": [(b"content-type", b"application/json")],
            })
            await send({"type": "http.response.body", "body": b'{"error":"unauthorized"}'})
            return

        await self.app(scope, receive, send)


authed_mcp_app = _BearerAuthASGI(mcp_app, settings.orchestrator_token)

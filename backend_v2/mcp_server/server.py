"""
Momentum MCP server — the contract between Momentum (data + UI, source of truth)
and its agent clients.

It exposes a small set of verbs over MCP (streamable-HTTP transport) and is a thin
wrapper over the existing ``firestore_service`` — so the MCP and the REST API share one
data layer and can never drift. It is mounted into the FastAPI app at ``/mcp`` and
deployed alongside the API.

Auth model
----------
Requests are authenticated via user-generated API keys. A key is prefixed ``mom_``
and is passed as a standard Bearer token::

    Authorization: Bearer mom_<key>

The key is SHA-256 hashed and looked up in the ``api_keys`` Firestore collection to
resolve the owning user ID. The resolved user ID is stored in a per-request ContextVar
so all tool handlers operate on the correct user without any global state. Users create
and revoke keys through the ``POST/GET/DELETE /api/keys`` REST endpoints.

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
import contextvars
import os
import sys
from datetime import datetime, timezone
from typing import Any, Optional

# Allow `python mcp_server/server.py` as well as `python -m mcp_server.server`
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from mcp.server.fastmcp import FastMCP

from services.firestore_service import firestore_service
from models.momentum import (
    AgentLogEntry,
    CreateAgentDirectiveRequest,
    UpdateRunRequest,
    RunItem,
)
from skills_catalog import get_catalog

MAX_AGENT_DIRECTIVES_PER_DAY = 3

mcp = FastMCP("momentum", stateless_http=True, streamable_http_path="/")

# Per-request user ID — set by _ApiKeyAuthASGI before the MCP handler runs.
_request_user_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_user_id")


def _user_id() -> str:
    try:
        return _request_user_id.get()
    except LookupError:
        raise RuntimeError("No authenticated user in MCP request context.")


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


class _ApiKeyAuthASGI:
    """
    Gate every request to the MCP endpoint behind a user API key.

    The Bearer token is looked up in the api_keys Firestore collection (by SHA-256 hash).
    On success the resolved user ID is stored in _request_user_id so tool handlers can
    call _user_id() without any global state. On failure a 401 JSON response is returned.
    Non-HTTP scopes (websocket, lifespan) pass through unchanged.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        auth_header = headers.get(b"authorization", b"").decode()

        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

        if not token:
            await self._reject(send)
            return

        user_id = await firestore_service.lookup_api_key(token)
        if not user_id:
            await self._reject(send)
            return

        _request_user_id.set(user_id)
        await self.app(scope, receive, send)

    @staticmethod
    async def _reject(send):
        await send({
            "type": "http.response.start",
            "status": 401,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({"type": "http.response.body", "body": b'{"error":"unauthorized"}'})


authed_mcp_app = _ApiKeyAuthASGI(mcp_app)

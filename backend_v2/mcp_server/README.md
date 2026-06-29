# Momentum MCP Server

The **contract** between Momentum (data + UI, the source of truth) and its agent
clients. It exposes a small set of verbs over [MCP](https://modelcontextprotocol.io)
and is a thin wrapper over [`firestore_service`](../services/firestore_service.py),
so the MCP and the REST API always share one data layer.

> One interface, two consumers: the autonomous orchestrator and an interactive Claude
> session both speak to Momentum through these same tools.

## Verbs

| Tool | Purpose |
|---|---|
| `get_active_epics()` | List workstreams (epics) with directives, resources, agent_log |
| `get_epic_context(epic_id)` | Full context for one epic + recent check-in history |
| `get_pending_directives(epic_id?)` | Directives with `agent.status == "queued"` |
| `set_directive_status(epic_id, directive_id, status, error?)` | Lifecycle transition |
| `write_directive_result(epic_id, directive_id, result, result_ref?)` | Persist agent output |
| `append_agent_log(epic_id, directive_id, skill, summary, result_ref?)` | Append-only audit entry |
| `create_directive(epic_id, skill, name, brief, created_by?)` | Surface new agent work (guardrailed) |

Plus `list_skills`, `create_run` / `update_run` (run history), and
`set_schedule_run_times` (scheduler bookkeeping).

Lifecycle: `queued → running → done | failed | needs_review`. Every transition is
written to Firestore. The agent log is append-only.

**Guardrail:** `create_directive` with `created_by="agent"` is capped at 3 new
directives per epic per day, enforced here at the contract layer.

## Transport & deployment

The MCP runs over **streamable HTTP**, mounted into the FastAPI app at `/mcp` and
deployed **alongside the API** (`main.py` mounts it and wires the session-manager
lifespan). It uses `firestore_service` server-side — Firebase Admin credentials stay
on the backend and never reach the local orchestrator.

> Path note: the inner app is built with `streamable_http_path="/"` and mounted at
> `/mcp`, so the endpoint is exactly `<base-url>/mcp`. If a client gets a 404/307,
> try a trailing slash (`/mcp/`).

## Authentication

The `/mcp` endpoint is gated by a static bearer token (`_BearerAuthASGI`). Any request
without the right token gets a 401 — there are no unauthenticated requests. On success
the server operates as a single configured user:

```bash
ORCHESTRATOR_TOKEN=<strong-random>   # the local orchestrator must send this as Bearer
ORCHESTRATOR_USER_ID=<firebase-uid>  # the user the orchestrator acts as
```

Generate the token once: `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
The same value goes in the orchestrator's `MOMENTUM_MCP_TOKEN`. Multi-user later = a
token→uid lookup plus per-request identity.

Hardening path: deploy the MCP as its own Cloud Run service with
`--no-allow-unauthenticated` + IAM so unauthenticated calls are rejected at the edge.

## Why epic_id is in every signature

The brief's verbs (e.g. `set_directive_status(id, status)`) assume a flat directive
namespace. Momentum stores directives nested under their epic
(`/users/{uid}/epics/{epicId}/directives/{id}`), so each verb takes `epic_id` to
locate the document without an extra lookup.

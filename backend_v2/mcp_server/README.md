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
on the backend and never reach the agent.

> Path note: the inner app is built with `streamable_http_path="/"` and mounted at
> `/mcp`, so the endpoint is exactly `<base-url>/mcp`. If a client gets a 404/307,
> try a trailing slash (`/mcp/`).

## Authentication

The `/mcp` endpoint is gated by **per-user API keys** — no backend configuration
required. Users generate keys through the Momentum UI (profile menu → API keys) or
directly via the REST API:

```bash
# Create a key (requires a Firebase ID token)
curl -X POST https://<api-url>/api/keys \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "my agent"}'
# → {"keyId": "...", "name": "my agent", "key": "mom_...", "createdAt": "..."}
```

The plaintext key is returned **once** and never stored. Pass it to your agent as a
standard Bearer token:

```
Authorization: Bearer mom_<key>
MCP endpoint:  https://<api-url>/mcp
```

Each key resolves to the owning user's Firebase UID via a SHA-256 hash lookup in the
`api_keys` Firestore collection. All MCP tools then operate as that user — fully
multi-tenant, no hardcoded identity.

### Key management endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/keys` | Create a key (returns plaintext once) |
| `GET` | `/api/keys` | List keys for the current user |
| `DELETE` | `/api/keys/{key_id}` | Revoke a key immediately |

All three require a Firebase ID token (`Authorization: Bearer <firebase-id-token>`).

### Firestore layout

```
/api_keys/{sha256(key)}
  userId:     string   # owning Firebase UID
  keyId:      string   # stable UUID for UI management
  name:       string
  createdAt:  string   # ISO-8601
  lastUsedAt: string?  # updated on every successful auth
```

The document ID is the SHA-256 hash of the key, giving O(1) auth lookups without
a full collection scan. `lastUsedAt` is updated on every successful request.

## Why epic_id is in every signature

The brief's verbs (e.g. `set_directive_status(id, status)`) assume a flat directive
namespace. Momentum stores directives nested under their epic
(`/users/{uid}/epics/{epicId}/directives/{id}`), so each verb takes `epic_id` to
locate the document without an extra lookup.

"""
Skills catalog — the single source of truth for which agent skills exist, what they
do, and their properties. Both consumers read from here:

  - the UI, via GET /api/skills (so users can see what's available and pick skills)
  - the orchestrator / Claude, via the list_skills MCP verb

`available` reflects whether the skill is actually implemented in the orchestrator
yet, so the catalog can advertise planned skills (greyed out in the UI) before their
modules exist.
"""

SKILLS = [
    {
        "name": "research",
        "label": "Research",
        "description": "Searches the web and summarizes findings to advance the epic.",
        "requiresReview": False,
        "createsDirectives": False,
        "requiredMcps": [],
        "available": True,
    },
    {
        "name": "code",
        "label": "Code",
        "description": "Uses the GitHub MCP to summarize PRs, triage issues, and gather code context.",
        "requiresReview": False,
        "createsDirectives": False,
        "requiredMcps": ["github"],
        "available": False,
    },
    {
        "name": "email",
        "label": "Email draft",
        "description": "Uses the Gmail MCP to draft and stage outbound emails for your approval.",
        "requiresReview": True,
        "createsDirectives": False,
        "requiredMcps": ["gmail"],
        "available": False,
    },
    {
        "name": "schedule",
        "label": "Schedule",
        "description": "Uses the Google Calendar MCP to find time and draft invites for your approval.",
        "requiresReview": True,
        "createsDirectives": False,
        "requiredMcps": ["google-calendar"],
        "available": False,
    },
    {
        "name": "logistics",
        "label": "Logistics",
        "description": "General planning: checklists, resource gathering, next-step breakdowns.",
        "requiresReview": False,
        "createsDirectives": True,
        "requiredMcps": [],
        "available": False,
    },
    {
        "name": "brainstorm",
        "label": "Brainstorm",
        "description": "Generates new directives for the epic. Capped at 3/day and staged for review.",
        "requiresReview": True,
        "createsDirectives": True,
        "requiredMcps": [],
        "available": False,
    },
]


def get_catalog() -> list[dict]:
    """Return the skills catalog (JSON-serializable)."""
    return [dict(s) for s in SKILLS]

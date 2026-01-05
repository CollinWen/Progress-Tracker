# Momentum: Implementation Specification

## Overview

Momentum is a personal productivity tool that helps track progress toward long-term goals through incremental daily/weekly check-ins. It's inspired by Jira/scrum workflows but adapted for solo use, with behavioral science principles from Atomic Habits and Tim Urban's work on procrastination.

The core insight: rigid systems fail for this user. The app should make progress visible and reduce friction, not impose strict accountability. It surfaces what's being neglected and what has momentum, letting the user make conscious decisions about prioritization.

---

## Core Concepts

### Epics
Large, overarching goals that can be opened and closed. These map to things like "Launch lighting business" or "Complete 2 endurance races in 2025."

### Directives
The recurring activities within an epic that drive progress. Each directive has a type and a check-in interval. For example, the "Race Season" epic might have directives for "Structured training" (weekly), "Performance tracking" (biweekly), and "Race registration" (as-needed/arrange).

### Logs
Individual check-in entries. The primary metric is **days invested** (how many days you touched something), not hours or tasks completed. Hours are optional supplementary data.

### Activity Types
Six categories that describe the nature of work:

| Type | Description | Use Case |
|------|-------------|----------|
| `build` | Active creation, making something | Coding, writing, designing, cooking |
| `learn` | Absorbing new information | Reading papers, courses, studying Chinese |
| `train` | Physical practice and conditioning | Workouts, race training |
| `research` | Exploration and discovery | Market research, browsing for ideas |
| `plan` | Strategy and decision-making | Goal setting, prioritizing, architecture |
| `arrange` | Logistics and setup | Signing up, scheduling, booking, buying equipment |

The `arrange` type is important—it acknowledges that logistics often gate everything else and registering for a race is real progress even if no training happened.

### Phases
Epics have a phase that the user manually updates to reflect where they are:

- `exploring` — Early stage, figuring out direction
- `building` — Actively working on it
- `active` — Ongoing/maintenance mode
- `refining` — Polishing, nearly complete
- `paused` — Intentionally deprioritized (not failure, just not now)

### Check-in Intervals
Directives have suggested check-in frequencies:

- `daily`
- `weekly`
- `biweekly`
- `monthly`

These determine when something is flagged as "needs attention" (overdue).

---

## Data Model

### TypeScript Types

```typescript
type ActivityType = 'build' | 'learn' | 'train' | 'research' | 'plan' | 'arrange';

type Phase = 'exploring' | 'building' | 'active' | 'refining' | 'paused';

type CheckinInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface User {
  name: string;
  createdAt: string; // ISO date
}

interface Directive {
  id: string;
  name: string;
  type: ActivityType;
  interval: CheckinInterval;
  createdAt: string; // ISO date
}

interface Epic {
  id: string;
  name: string;
  emoji: string; // User-customizable, e.g., "💡"
  description: string;
  phase: Phase;
  createdAt: string; // ISO date
  deadline: string | null; // ISO date, optional
  target: {
    current: number;
    total: number;
    unit: string; // e.g., "races", "books", "projects"
  } | null;
  directives: Directive[];
}

interface Log {
  id: string;
  epicId: string;
  directiveId: string;
  timestamp: string; // ISO datetime
  durationMinutes: number | null; // Optional
  note: string; // Free-form text, can be AI-parsed
  source: 'manual' | 'voice' | 'text' | 'call'; // How the log was created
}

interface MomentumData {
  version: number;
  user: User;
  epics: Epic[];
  logs: Log[];
}
```

### Sample JSON Structure

```json
{
  "version": 1,
  "user": {
    "name": "Collin",
    "createdAt": "2025-01-01"
  },
  "epics": [
    {
      "id": "epic_001",
      "name": "Lighting Business",
      "emoji": "💡",
      "description": "Computational paper lamps → market",
      "phase": "building",
      "createdAt": "2025-01-01",
      "deadline": null,
      "target": null,
      "directives": [
        {
          "id": "dir_001",
          "name": "Assembly mechanism R&D",
          "type": "build",
          "interval": "weekly",
          "createdAt": "2025-01-01"
        },
        {
          "id": "dir_002",
          "name": "Market & pricing research",
          "type": "research",
          "interval": "biweekly",
          "createdAt": "2025-01-01"
        },
        {
          "id": "dir_003",
          "name": "Store setup & fulfillment",
          "type": "arrange",
          "interval": "monthly",
          "createdAt": "2025-01-01"
        }
      ]
    },
    {
      "id": "epic_002",
      "name": "Race Season 2025",
      "emoji": "🏃",
      "description": "Half marathon + triathlon",
      "phase": "active",
      "createdAt": "2025-01-01",
      "deadline": "2025-06-15",
      "target": {
        "current": 0,
        "total": 2,
        "unit": "races"
      },
      "directives": [
        {
          "id": "dir_004",
          "name": "Structured training",
          "type": "train",
          "interval": "weekly",
          "createdAt": "2025-01-01"
        },
        {
          "id": "dir_005",
          "name": "Race registration & logistics",
          "type": "arrange",
          "interval": "monthly",
          "createdAt": "2025-01-01"
        }
      ]
    }
  ],
  "logs": [
    {
      "id": "log_001",
      "epicId": "epic_001",
      "directiveId": "dir_001",
      "timestamp": "2025-01-02T14:30:00Z",
      "durationMinutes": 60,
      "note": "Worked on hinge mechanism, tried 3 different approaches",
      "source": "manual"
    }
  ]
}
```

---

## Computed/Derived Data

These are calculated from logs at runtime, not stored:

### Per Directive
- `daysActive`: Count of unique dates with logs for this directive
- `hoursLogged`: Sum of `durationMinutes / 60` across all logs
- `lastCheckin`: Most recent log timestamp
- `isOverdue`: Based on interval vs. days since last check-in
  - daily: overdue if > 1 day
  - weekly: overdue if > 7 days
  - biweekly: overdue if > 14 days
  - monthly: overdue if > 30 days

### Per Epic
- `totalDaysInvested`: Sum of `daysActive` across all directives
- `totalHoursLogged`: Sum of hours across all directives
- `commitHistory`: Array of 52 values (0 or 1) representing whether any log exists for each of the last 52 days
- `recentDensity`: Percentage of the last 14 days with activity

### Global
- `suggestedActions`: Mix of:
  - Neglected directives (overdue based on interval)
  - High-momentum directives (most `daysActive`)

---

## Google Drive Storage

### Setup
1. Create Google Cloud project
2. Enable Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials (web client)
5. Request scope: `https://www.googleapis.com/auth/drive.file` (only files created by app)

### File Structure
```
User's Google Drive
└── momentum/
    └── data.json
```

### Operations Needed

```typescript
// Initialize: Check for existing data or create new
async function initializeStorage(): Promise<MomentumData>

// Load data from Drive
async function loadData(): Promise<MomentumData>

// Save data to Drive (full overwrite)
async function saveData(data: MomentumData): Promise<void>

// Auth
async function signIn(): Promise<void>
async function signOut(): Promise<void>
function isSignedIn(): boolean
```

### Implementation Notes
- Use `gapi` client library
- Store file ID in localStorage after first creation to avoid repeated searches
- Implement optimistic UI updates with background saves
- Handle offline gracefully (cache in localStorage, sync when back online)

---

## UI Components

### Design System (Wellness Aesthetic)

**Colors**
```css
--bg-primary: #f7f5f2;      /* Warm off-white */
--bg-card: #ffffff;
--bg-subtle: #fafaf8;
--text-primary: #2d2d2d;    /* Near-black */
--text-secondary: #7a756e;
--text-muted: #9a958e;
--border: #eae6e1;
--accent-positive: #4a7171; /* Sage/teal for good states */
--accent-warning: #c49a5c;  /* Warm amber for attention */
--accent-success: #5c8a6e;  /* Green for momentum */
```

**Typography**
- Font: DM Sans (Google Fonts)
- Weights: 400, 500, 600, 700
- Large numbers: 36px, font-weight 600, letter-spacing -0.03em
- Body: 15px
- Labels: 13px, uppercase, letter-spacing 0.1em

**Spacing & Radius**
- Border radius: 12-20px for cards, 10-14px for buttons
- Card padding: 28-32px
- Section spacing: 48-56px

### Component Hierarchy

```
App
├── Header
│   ├── Logo ("momentum")
│   ├── Weekly Report button
│   └── Check-in button
├── Main
│   ├── Greeting (day of year, time-based greeting)
│   ├── SuggestedActions
│   │   └── SuggestedActionCard (repeated)
│   └── EpicsList
│       └── EpicCard (repeated)
│           ├── Epic header (emoji, name, phase badge, deadline)
│           ├── CommitGraph
│           ├── Stats (days invested, recent %, target progress)
│           └── DirectivesList (when expanded)
│               └── DirectiveRow (repeated)
└── CheckinModal
    ├── Text input (natural language)
    ├── Activity type selector
    └── Submit/Cancel
```

### Key UI Behaviors

1. **Epic cards are collapsible** — Click to expand/collapse directive list
2. **Suggested actions** — Show 2-4 items mixing neglected + high-momentum
3. **Overdue highlighting** — Subtle warm background on overdue directives
4. **Phase badges** — Colored pills (tinted backgrounds, not solid)
5. **Commit graph** — 52 columns × 7 rows of small rounded squares

---

## Check-in Flow

### Tiered Friction Model

**Lowest friction (daily)**
- Quick text input parsed by AI
- "Made progress on [epic]" → binary check-in
- Single tap in app

**Medium friction (when wanted)**
- Select epic + directive explicitly
- Add duration
- Add notes

**Highest friction (weekly)**
- Photo uploads
- Reflection prompts
- Review and annotate

### For MVP
Implement manual check-in with:
1. Free-form text input
2. Optional activity type selection
3. Optional duration
4. Auto-associate with epic/directive (user selects or AI suggests)

---

## Initial Epics to Seed

Based on user's New Year's resolutions:

| Epic | Emoji | Target | Deadline | Directives |
|------|-------|--------|----------|------------|
| Lighting Business | 💡 | null | null | Assembly R&D (build/weekly), Market research (research/biweekly), Store setup (arrange/monthly) |
| Race Season 2025 | 🏃 | 2 races | 2025-06-15 | Training (train/weekly), Performance tracking (research/biweekly), Registration (arrange/monthly) |
| Deep Reading | 📖 | 5 books | null | Book reading (learn/daily), Paper reading (learn/weekly) |
| Side Projects | ⚡ | 4 projects | null | Active development (build/weekly), Ideation (plan/biweekly) |
| Academic Course | 🎓 | 1 course | null | Course selection (research/monthly), Weekly lessons (learn/weekly) |
| Daily Practice | 🌱 | null | null | Chinese (learn/daily), Cooking (build/weekly), Screen time (plan/daily) |

---

## MVP Scope

### Must Have
- [ ] Google OAuth sign-in
- [ ] Create/read/update data in Drive
- [ ] Display epics with commit graphs
- [ ] Expand epic to see directives
- [ ] Log progress (basic form)
- [ ] Compute days active, last check-in, overdue status
- [ ] Suggested actions section

### Nice to Have (v1.1)
- [ ] Create/edit/delete epics
- [ ] Create/edit/delete directives
- [ ] Weekly report view
- [ ] Offline support with sync

### Future
- [ ] AI parsing of natural language check-ins
- [ ] Voice/phone call check-ins via MCP
- [ ] Photo attachments on logs
- [ ] Export/backup functionality

---

## File Structure Suggestion

```
/src
  /components
    Header.tsx
    EpicCard.tsx
    DirectiveRow.tsx
    CommitGraph.tsx
    SuggestedAction.tsx
    CheckinModal.tsx
    PhaseBadge.tsx
  /hooks
    useGoogleAuth.ts
    useMomentumData.ts
  /lib
    googleDrive.ts
    computeDerivedData.ts
    types.ts
  /styles
    globals.css
  App.tsx
  main.tsx
```

---

## Reference Files

The UI template is in `momentum-wellness.jsx` — this contains the visual design, component structure, and sample data. Convert this to a working app by:

1. Splitting into separate component files
2. Replacing sample data with Google Drive integration
3. Adding state management for CRUD operations
4. Implementing the check-in modal submission logic

---

## Key Design Principles (from conversation)

1. **Days invested over hours tracked** — The primary metric is "did I touch this today?" not "how long did I work?" This reduces friction and avoids the guilt of short sessions.

2. **Visible neglect, not punishment** — Show what's being ignored neutrally ("18 days since last check-in") rather than creating anxiety. The goal is informed decisions, not guilt.

3. **Arrange is a real activity type** — Logistics gate everything. Signing up for a race, setting up a dev environment, booking a flight—these count as progress.

4. **Phases over progress bars** — Open-ended goals don't have finish lines. "Building" → "Active" → "Paused" is more honest than "40% complete."

5. **Low friction default, detail when wanted** — Quick check-ins should be seconds. Detailed logging is opt-in.

6. **Wellness aesthetic** — Warm, premium, approachable. Think Athletic Greens or David Protein, not Jira. The app should feel like self-care, not work.
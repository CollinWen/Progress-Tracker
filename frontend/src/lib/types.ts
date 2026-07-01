export type ActivityType = 'build' | 'learn' | 'train' | 'research' | 'plan' | 'arrange';

export type Phase = 'exploring' | 'building' | 'active' | 'refining' | 'paused';

export type CheckinInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type LogSource = 'manual' | 'voice' | 'text' | 'call';

export type SessionType = 'quick' | 'blocked' | 'deep';

// ── Agent orchestrator types ──
// Additive: the autonomous orchestrator (a separate client of Momentum) reads/writes
// these. Human-facing fields are unchanged, so existing UI keeps working.
export type AgentSkill = 'research' | 'code' | 'email' | 'schedule' | 'logistics' | 'brainstorm';
export type AgentStatus = 'queued' | 'running' | 'done' | 'failed' | 'needs_review';
export type CreatedBy = 'user' | 'agent';

export interface AgentMeta {
  skill: AgentSkill;       // routing key: which skill handles this directive
  brief: string;           // the instruction/goal for the agent
  status: AgentStatus;     // processing lifecycle
  createdBy: CreatedBy;
  result?: unknown | null; // structured payload written on completion
  resultRef?: string | null; // pointer to full artifact
  error?: string | null;
  updatedAt?: string | null;
}

export interface EpicResources {
  mcps: string[];          // e.g. ["github", "google-calendar"]
  skills: string[];        // e.g. ["research", "code"]
  contextUrls: string[];   // reference docs, repos, relevant links
}

export interface AgentLogEntry {
  timestamp: string;
  directiveId: string;
  skill: string;
  summary: string;
  resultRef?: string | null;
}

export interface EpicSchedule {
  enabled: boolean;
  cron: string;            // standard cron expression
  timezone: string;        // IANA tz, e.g. "America/New_York"
  lastRunAt?: string | null;
  nextRunAt?: string | null;
}

// A catalog entry describing a skill the agent can run (from GET /api/skills).
export interface SkillCatalogItem {
  name: AgentSkill;
  label: string;
  description: string;
  requiresReview: boolean;   // result parks at needs_review before any side effect
  createsDirectives: boolean; // may surface new todos
  requiredMcps: string[];
  available: boolean;         // implemented in the orchestrator yet?
}

export type RunTrigger = 'manual' | 'scheduled';
export type RunStatus = 'running' | 'completed' | 'failed';

export interface RunArtifact {
  type: string;            // commit | url | draft | directive | other
  ref: string;
  label?: string | null;
}

export interface RunItem {
  directiveId: string;
  skill: string;
  status: string;          // done | failed | needs_review
  summary?: string | null;
  resultRef?: string | null;
  artifacts: RunArtifact[];
}

export interface ApiKey {
  keyId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

export interface CreateApiKeyResponse {
  keyId: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface Run {
  id: string;
  epicId: string;
  trigger: RunTrigger;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string | null;
  items: RunItem[];
  createdDirectiveIds: string[];
  error?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO date
}

export interface Directive {
  id: string;
  name: string;
  type: ActivityType;
  progressType: 'ongoing' | 'task';
  isComplete: boolean;
  createdAt: string; // ISO date
  attachments?: Attachment[]; // Links for resources, docs, etc.
  order?: number; // For custom ordering
  agent?: AgentMeta | null; // Agent orchestrator metadata (absent = human-only directive)
}

export interface Attachment {
  id: string;
  type: 'link' | 'photo' | 'file';
  url: string;
  name: string;
  thumbnail?: string; // For photos
  createdAt: string; // ISO date
}

export interface Epic {
  id: string;
  uuid?: string; // Unique identifier for tracking/sharing
  name: string;
  color: string; // hex color representing this epic
  description: string;
  checkinInterval: CheckinInterval;
  createdAt: string; // ISO date
  deadline: string | null;
  target: {
    current: number;
    total: number;
    unit: string;
  } | null;
  tags?: string[]; // Categorization tags
  attachments?: Attachment[]; // Links, photos, files
  notes?: string; // Long-form notes about the epic
  directives: Directive[];
  order?: number; // For custom ordering
  resources?: EpicResources | null; // Agent tools/skills/context for this workstream
  agentLog?: AgentLogEntry[]; // Append-only audit of agent activity
  schedule?: EpicSchedule | null; // Recurring orchestrator schedule for this epic
}

export interface Log {
  id: string;
  epicId: string;
  directiveId: string;
  timestamp: string; // ISO datetime
  durationMinutes: number | null;
  sessionType: SessionType | null;
  note: string;
  source: LogSource;
}

export interface MomentumData {
  version: number;
  user: User;
  epics: Epic[];
  logs: Log[];
}

// Derived/computed data types (not stored, calculated at runtime)
export interface DirectiveStats {
  daysActive: number;
  hoursLogged: number;
  lastCheckin: string | null;
  isOverdue: boolean;
}

export interface EpicStats {
  totalDaysInvested: number;
  totalHoursLogged: number;
  commitHistory: number[]; // 52 values (0 or 1)
  recentDensity: number; // percentage
  phase: Phase;
}

export interface SuggestedAction {
  directive: Directive;
  epic: Epic;
  reason: 'neglected' | 'momentum';
  stats: DirectiveStats;
}

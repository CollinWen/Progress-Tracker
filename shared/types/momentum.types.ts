/**
 * Shared type definitions for Momentum app
 * These types should be kept in sync with backend Pydantic models
 */

export type ActivityType = 'build' | 'learn' | 'train' | 'research' | 'plan' | 'arrange';

export type Phase = 'exploring' | 'building' | 'active' | 'refining' | 'paused';

export type CheckinInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type LogSource = 'manual' | 'voice' | 'text' | 'call';

export type SessionType = 'quick' | 'blocked' | 'deep';

export type DirectiveProgressType = 'task' | 'ongoing'; // task = incomplete/complete, ongoing = inactive/active

// ── Agent orchestrator types (additive; consumed by the autonomous orchestrator) ──
export type AgentSkill = 'research' | 'code' | 'email' | 'schedule' | 'logistics' | 'brainstorm';
export type AgentStatus = 'queued' | 'running' | 'done' | 'failed' | 'needs_review';
export type CreatedBy = 'user' | 'agent';

export interface AgentMeta {
  skill: AgentSkill;
  brief: string;
  status: AgentStatus;
  createdBy: CreatedBy;
  result?: unknown | null;
  resultRef?: string | null;
  error?: string | null;
  updatedAt?: string | null;
}

export interface EpicResources {
  mcps: string[];
  skills: string[];
  contextUrls: string[];
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
  cron: string;
  timezone: string;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
}

export interface SkillCatalogItem {
  name: AgentSkill;
  label: string;
  description: string;
  requiresReview: boolean;
  createsDirectives: boolean;
  requiredMcps: string[];
  available: boolean;
}

export type RunTrigger = 'manual' | 'scheduled';
export type RunStatus = 'running' | 'completed' | 'failed';

export interface RunArtifact {
  type: string;
  ref: string;
  label?: string | null;
}

export interface RunItem {
  directiveId: string;
  skill: string;
  status: string;
  summary?: string | null;
  resultRef?: string | null;
  artifacts: RunArtifact[];
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
  createdAt: string; // ISO date
  progressType: DirectiveProgressType;
  isComplete: boolean; // Only relevant for progressType="task"
  agent?: AgentMeta | null; // Agent orchestrator metadata (absent = human-only directive)
}

export interface Epic {
  id: string;
  name: string;
  emoji: string;
  description: string;
  checkinInterval: CheckinInterval; // Determines when epic needs attention
  createdAt: string; // ISO date
  deadline: string | null; // ISO date, optional
  target: {
    current: number;
    total: number;
    unit: string; // e.g., "races", "books", "projects"
  } | null;
  directives: Directive[];
  resources?: EpicResources | null; // Agent tools/skills/context for this workstream
  agentLog?: AgentLogEntry[]; // Append-only audit of agent activity
  schedule?: EpicSchedule | null; // Recurring orchestrator schedule for this epic
}

export interface Log {
  id: string;
  epicId: string;
  directiveId: string;
  timestamp: string; // ISO datetime
  durationMinutes: number | null; // Optional
  sessionType: SessionType | null; // quick, blocked, or deep
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
  phase: Phase; // Computed based on recent activity
}

export interface SuggestedAction {
  directive: Directive;
  epic: Epic;
  reason: 'neglected' | 'momentum';
  stats: DirectiveStats;
}

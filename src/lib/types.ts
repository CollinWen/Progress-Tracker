export type ActivityType = 'build' | 'learn' | 'train' | 'research' | 'plan' | 'arrange';

export type Phase = 'exploring' | 'building' | 'active' | 'refining' | 'paused';

export type CheckinInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type LogSource = 'manual' | 'voice' | 'text' | 'call';

export interface User {
  name: string;
  createdAt: string; // ISO date
}

export interface Directive {
  id: string;
  name: string;
  type: ActivityType;
  interval: CheckinInterval;
  createdAt: string; // ISO date
}

export interface Epic {
  id: string;
  name: string;
  emoji: string;
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

export interface Log {
  id: string;
  epicId: string;
  directiveId: string;
  timestamp: string; // ISO datetime
  durationMinutes: number | null; // Optional
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
}

export interface SuggestedAction {
  directive: Directive;
  epic: Epic;
  reason: 'neglected' | 'momentum';
  stats: DirectiveStats;
}

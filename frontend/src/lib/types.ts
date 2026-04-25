export type ActivityType = 'build' | 'learn' | 'train' | 'research' | 'plan' | 'arrange';

export type Phase = 'exploring' | 'building' | 'active' | 'refining' | 'paused';

export type CheckinInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type LogSource = 'manual' | 'voice' | 'text' | 'call';

export type SessionType = 'quick' | 'blocked' | 'deep';

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

/**
 * API Request/Response type definitions
 * These define the contract between frontend and backend
 */

import type {
  User,
  Epic,
  Directive,
  Log,
  MomentumData,
  ActivityType,
  Phase,
  CheckinInterval,
  LogSource,
} from './momentum.types';

// ============================================================================
// Authentication
// ============================================================================

export interface SignInRequest {
  code: string; // OAuth authorization code from Google
}

export interface SignInResponse {
  user: User;
  accessToken: string;
}

export interface AuthMeResponse {
  user: User;
  isAuthenticated: boolean;
}

// ============================================================================
// Data Operations
// ============================================================================

export interface LoadDataResponse {
  data: MomentumData;
}

export interface SaveDataRequest {
  data: MomentumData;
}

export interface SaveDataResponse {
  success: boolean;
  timestamp: string;
}

// ============================================================================
// Epic Operations
// ============================================================================

export interface CreateEpicRequest {
  name: string;
  emoji: string;
  description: string;
  phase: Phase;
  deadline: string | null;
  target: {
    current: number;
    total: number;
    unit: string;
  } | null;
}

export interface CreateEpicResponse {
  epic: Epic;
}

export interface UpdateEpicRequest {
  name?: string;
  emoji?: string;
  description?: string;
  phase?: Phase;
  deadline?: string | null;
  target?: {
    current: number;
    total: number;
    unit: string;
  } | null;
}

export interface UpdateEpicResponse {
  epic: Epic;
}

export interface DeleteEpicResponse {
  success: boolean;
  deletedLogCount: number;
}

// ============================================================================
// Directive Operations
// ============================================================================

export interface CreateDirectiveRequest {
  name: string;
  type: ActivityType;
  interval: CheckinInterval;
}

export interface CreateDirectiveResponse {
  directive: Directive;
}

export interface UpdateDirectiveRequest {
  name?: string;
  type?: ActivityType;
  interval?: CheckinInterval;
}

export interface UpdateDirectiveResponse {
  directive: Directive;
}

export interface DeleteDirectiveResponse {
  success: boolean;
  deletedLogCount: number;
}

// ============================================================================
// Log Operations
// ============================================================================

export interface CreateLogRequest {
  epicId: string;
  directiveId: string;
  timestamp?: string; // Optional, defaults to now
  durationMinutes: number | null;
  note: string;
  source?: LogSource; // Optional, defaults to 'manual'
}

export interface CreateLogResponse {
  log: Log;
}

export interface DeleteLogResponse {
  success: boolean;
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  detail: string;
  code?: string;
}

import type { MomentumData, Epic, Directive, Log, User, SkillCatalogItem, Run } from '../lib/types';

/**
 * Interface for all backend data operations.
 * Implementations: LocalStorageService (MVP), GoogleDriveService (future)
 */
export interface DataService {
  // Authentication
  isAuthenticated(): boolean;
  waitForAuth(): Promise<User | null>;
  signIn(): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;

  // Data operations
  loadData(): Promise<MomentumData>;
  saveData(data: MomentumData): Promise<void>;
  loadEpics(): Promise<Epic[]>;
  loadLogs(options?: { epicId?: string; days?: number }): Promise<Log[]>;

  // Epic operations
  addEpic(epic: Omit<Epic, 'id' | 'createdAt' | 'directives'>): Promise<Epic>;
  updateEpic(epicId: string, updates: Partial<Epic>): Promise<void>;
  deleteEpic(epicId: string): Promise<void>;

  // Directive operations
  addDirective(
    epicId: string,
    directive: Omit<Directive, 'id' | 'createdAt'>
  ): Promise<Directive>;
  updateDirective(
    epicId: string,
    directiveId: string,
    updates: Partial<Directive>
  ): Promise<void>;
  deleteDirective(epicId: string, directiveId: string): Promise<void>;

  // Log operations
  addLog(log: Omit<Log, 'id'>): Promise<Log>;
  deleteLog(logId: string): Promise<void>;

  // Agent operations
  listSkills(): Promise<SkillCatalogItem[]>;
  listRuns(options?: { epicId?: string; limit?: number }): Promise<Run[]>;
}

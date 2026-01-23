import type { MomentumData, Epic, Directive, Log, User } from '../lib/types';
import { generateSeedData } from '../lib/computeDerivedData';
import type { DataService } from './DataService';

/**
 * LocalStorage implementation of DataService.
 * Used for demo mode and offline-first functionality.
 */
export class LocalStorageService implements DataService {
  private readonly STORAGE_KEY = 'momentum_data';
  private data: MomentumData | null = null;

  // Demo user for unauthenticated mode
  private demoUser: User = {
    name: 'Demo User',
    createdAt: new Date().toISOString().split('T')[0],
  };

  // Authentication methods
  isAuthenticated(): boolean {
    return false; // Always false for localStorage
  }

  async signIn(): Promise<User> {
    throw new Error('Sign in not available in demo mode. Use Google Drive service.');
  }

  async signOut(): Promise<void> {
    // No-op for localStorage
  }

  getCurrentUser(): User | null {
    return this.demoUser;
  }

  // Data operations
  async loadData(): Promise<MomentumData> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.data = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored data:', e);
        this.data = this.createDefaultData();
      }
    } else {
      this.data = this.createDefaultData();
    }
    // TypeScript guard: this.data is guaranteed to be set above
    return this.data!;
  }

  async saveData(data: MomentumData): Promise<void> {
    this.data = data;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  private createDefaultData(): MomentumData {
    const seedData = generateSeedData();
    // Override user with demo user
    seedData.user = this.demoUser;
    return seedData;
  }

  // Epic operations
  async addEpic(epic: Omit<Epic, 'id' | 'createdAt' | 'directives'>): Promise<Epic> {
    if (!this.data) await this.loadData();

    const newEpic: Epic = {
      ...epic,
      id: `epic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().split('T')[0],
      directives: [],
    };

    this.data!.epics.push(newEpic);
    await this.saveData(this.data!);

    return newEpic;
  }

  async updateEpic(epicId: string, updates: Partial<Epic>): Promise<void> {
    if (!this.data) await this.loadData();

    this.data!.epics = this.data!.epics.map((epic) => {
      if (epic.id === epicId) {
        // Exclude directives from updates to prevent overwriting them
        const { directives: _ignored, ...safeUpdates } = updates;
        return { ...epic, ...safeUpdates };
      }
      return epic;
    });

    await this.saveData(this.data!);
  }

  async deleteEpic(epicId: string): Promise<void> {
    if (!this.data) await this.loadData();

    this.data!.epics = this.data!.epics.filter((epic) => epic.id !== epicId);
    // Also remove all logs for this epic
    this.data!.logs = this.data!.logs.filter((log) => log.epicId !== epicId);

    await this.saveData(this.data!);
  }

  // Directive operations
  async addDirective(
    epicId: string,
    directive: Omit<Directive, 'id' | 'createdAt'>
  ): Promise<Directive> {
    if (!this.data) await this.loadData();

    const newDirective: Directive = {
      ...directive,
      id: `dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.data!.epics = this.data!.epics.map((epic) =>
      epic.id === epicId
        ? { ...epic, directives: [...epic.directives, newDirective] }
        : epic
    );

    await this.saveData(this.data!);

    return newDirective;
  }

  async updateDirective(
    epicId: string,
    directiveId: string,
    updates: Partial<Directive>
  ): Promise<void> {
    if (!this.data) await this.loadData();

    this.data!.epics = this.data!.epics.map((epic) =>
      epic.id === epicId
        ? {
            ...epic,
            directives: epic.directives.map((directive) =>
              directive.id === directiveId
                ? { ...directive, ...updates }
                : directive
            ),
          }
        : epic
    );

    await this.saveData(this.data!);
  }

  async deleteDirective(epicId: string, directiveId: string): Promise<void> {
    if (!this.data) await this.loadData();

    this.data!.epics = this.data!.epics.map((epic) =>
      epic.id === epicId
        ? {
            ...epic,
            directives: epic.directives.filter((d) => d.id !== directiveId),
          }
        : epic
    );

    // Also remove all logs for this directive
    this.data!.logs = this.data!.logs.filter(
      (log) => log.directiveId !== directiveId
    );

    await this.saveData(this.data!);
  }

  // Log operations
  async addLog(log: Omit<Log, 'id'>): Promise<Log> {
    if (!this.data) await this.loadData();

    const newLog: Log = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.data!.logs.push(newLog);
    await this.saveData(this.data!);

    return newLog;
  }

  async deleteLog(logId: string): Promise<void> {
    if (!this.data) await this.loadData();

    this.data!.logs = this.data!.logs.filter((log) => log.id !== logId);
    await this.saveData(this.data!);
  }
}

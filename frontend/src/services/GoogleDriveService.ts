import type { MomentumData, Epic, Directive, Log, User, SkillCatalogItem, Run, ApiKey, CreateApiKeyResponse } from '../lib/types';
import type { DataService } from './DataService';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface SignInResponse {
  access_token: string;
  user: AuthUser;
  file_id: string;
}

/**
 * Google Drive implementation of DataService.
 * Calls the backend API for authentication and data operations.
 */
export class GoogleDriveService implements DataService {
  private token: string | null = null;
  private fileId: string | null = null;
  private user: User | null = null;
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Try to restore session from sessionStorage (memory-like storage)
    this.restoreSession();
  }

  /**
   * Restore session from sessionStorage if available.
   */
  private restoreSession(): void {
    const token = sessionStorage.getItem('momentum_token');
    const fileId = sessionStorage.getItem('momentum_file_id');
    const userData = sessionStorage.getItem('momentum_user');

    if (token && fileId && userData) {
      this.token = token;
      this.fileId = fileId;
      this.user = JSON.parse(userData);
    }
  }

  /**
   * Clear session from sessionStorage.
   */
  private clearSession(): void {
    sessionStorage.removeItem('momentum_token');
    sessionStorage.removeItem('momentum_file_id');
    sessionStorage.removeItem('momentum_user');

    this.token = null;
    this.fileId = null;
    this.user = null;
  }

  /**
   * Make authenticated API request.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Merge with any custom headers
    if (options.headers) {
      const customHeaders = options.headers as Record<string, string>;
      Object.assign(headers, customHeaders);
    }

    const url = `${this.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear session
          this.clearSession();
          throw new Error('Session expired. Please sign in again.');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.statusText}`);
      }

      // Handle empty responses (like DELETE)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.fileId !== null && this.user !== null;
  }

  async waitForAuth(): Promise<User | null> {
    // GoogleDriveService restores session synchronously from sessionStorage in the
    // constructor, so isAuthenticated() is already accurate by the time this is called.
    return this.isAuthenticated() ? this.getCurrentUser() : null;
  }

  async signIn(): Promise<User> {
    // Redirect to backend OAuth endpoint
    // Backend will handle the OAuth flow and redirect back with token
    const backendOAuthUrl = `${this.apiUrl}/auth/google/login`;
    window.location.href = backendOAuthUrl;

    // Return a never-resolving promise since we're redirecting away
    return new Promise(() => {});
  }

  async signOut(): Promise<void> {
    if (!this.token) {
      this.clearSession();
      return;
    }

    try {
      await this.request('/auth/signout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear session anyway
    }

    this.clearSession();
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  async loadData(): Promise<MomentumData> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    return this.request<MomentumData>(`/api/data?file_id=${this.fileId}`);
  }

  async saveData(data: MomentumData): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(`/api/data?file_id=${this.fileId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addEpic(epic: Omit<Epic, 'id' | 'createdAt' | 'directives'>): Promise<Epic> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    return this.request<Epic>(`/api/epics?file_id=${this.fileId}`, {
      method: 'POST',
      body: JSON.stringify(epic),
    });
  }

  async updateEpic(epicId: string, updates: Partial<Epic>): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(`/api/epics/${epicId}?file_id=${this.fileId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteEpic(epicId: string): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(`/api/epics/${epicId}?file_id=${this.fileId}`, {
      method: 'DELETE',
    });
  }

  async addDirective(
    epicId: string,
    directive: Omit<Directive, 'id' | 'createdAt'>
  ): Promise<Directive> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    return this.request<Directive>(
      `/api/epics/${epicId}/directives?file_id=${this.fileId}`,
      {
        method: 'POST',
        body: JSON.stringify(directive),
      }
    );
  }

  async updateDirective(
    epicId: string,
    directiveId: string,
    updates: Partial<Directive>
  ): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(
      `/api/epics/${epicId}/directives/${directiveId}?file_id=${this.fileId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  async deleteDirective(epicId: string, directiveId: string): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(
      `/api/epics/${epicId}/directives/${directiveId}?file_id=${this.fileId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async addLog(log: Omit<Log, 'id'>): Promise<Log> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    return this.request<Log>(`/api/logs?file_id=${this.fileId}`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  async deleteLog(logId: string): Promise<void> {
    if (!this.fileId) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    await this.request(`/api/logs/${logId}?file_id=${this.fileId}`, {
      method: 'DELETE',
    });
  }

  async loadEpics(): Promise<Epic[]> {
    const data = await this.loadData();
    return data.epics;
  }

  async loadLogs(options?: { epicId?: string; days?: number }): Promise<Log[]> {
    const data = await this.loadData();
    let logs = data.logs;
    if (options?.epicId) {
      logs = logs.filter((l) => l.epicId === options.epicId);
    }
    if (options?.days !== undefined) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - options.days);
      logs = logs.filter((l) => new Date(l.timestamp) >= cutoff);
    }
    return logs;
  }

  async listSkills(): Promise<SkillCatalogItem[]> { return []; }
  async listRuns(_options?: { epicId?: string; limit?: number }): Promise<Run[]> { return []; }
  async listApiKeys(): Promise<ApiKey[]> { return []; }
  async createApiKey(_name: string): Promise<CreateApiKeyResponse> {
    throw new Error('API keys require a Firestore backend connection.');
  }
  async revokeApiKey(_keyId: string): Promise<void> {}
}

import type { MomentumData, Epic, Directive, Log, User } from '../lib/types';
import type { DataService } from './DataService';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  Auth,
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

/**
 * Firestore implementation of DataService.
 * Uses Firebase Authentication and Firestore for data storage.
 */
export class FirestoreService implements DataService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private currentUser: User | null = null;
  private firebaseUser: FirebaseUser | null = null;
  // Resolves once Firebase has determined the initial auth state (persisted or not).
  private authReady: Promise<User | null>;
  private resolveAuthReady!: (user: User | null) => void;

  constructor() {
    this.authReady = new Promise((resolve) => { this.resolveAuthReady = resolve; });
    this.initializeFirebase();
    this.restoreSession();
  }

  /**
   * Initialize Firebase app with config from environment variables.
   */
  private initializeFirebase(): void {
    const config: FirebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    };

    // Validate config
    if (!config.apiKey || !config.authDomain || !config.projectId) {
      console.warn('Firebase config incomplete. Set VITE_FIREBASE_* environment variables.');
      return;
    }

    this.app = initializeApp(config);
    this.auth = getAuth(this.app);
    // Explicitly persist the session in localStorage so it survives page refreshes.
    setPersistence(this.auth, browserLocalPersistence).catch(console.error);
  }

  /**
   * Subscribe to Firebase auth state changes.
   * The first callback resolves authReady so waitForAuth() can return.
   */
  private restoreSession(): void {
    if (!this.auth) {
      this.resolveAuthReady(null);
      return;
    }

    let initialStateResolved = false;

    this.auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        this.firebaseUser = firebaseUser;
        this.currentUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || 'User',
          email: firebaseUser.email || '',
          createdAt: new Date().toISOString(),
        };
      } else {
        this.firebaseUser = null;
        this.currentUser = null;
      }

      // Resolve the promise on the first callback — this is when Firebase has
      // finished checking localStorage for a persisted session.
      if (!initialStateResolved) {
        initialStateResolved = true;
        this.resolveAuthReady(this.currentUser);
      }
    });
  }

  /**
   * Wait for Firebase to determine the initial auth state.
   * Returns the persisted user, or null if not logged in.
   */
  async waitForAuth(): Promise<User | null> {
    return this.authReady;
  }

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.firebaseUser !== null;
  }

  /**
   * Get current authenticated user.
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Sign in with Google OAuth.
   */
  async signIn(): Promise<User> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);

    this.firebaseUser = result.user;
    this.currentUser = {
      id: result.user.uid,
      name: result.user.displayName || result.user.email || 'User',
      email: result.user.email || '',
      createdAt: new Date().toISOString(),
    };

    // Create user document in Firestore if it doesn't exist
    await this.ensureUserDocument();

    return this.currentUser;
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    if (!this.auth) return;
    await firebaseSignOut(this.auth);
    this.currentUser = null;
    this.firebaseUser = null;
  }

  /**
   * Ensure user document exists in Firestore.
   * This is handled by the backend API when the user first loads data.
   */
  private async ensureUserDocument(): Promise<void> {
    // No-op: User document creation is handled by backend
    // The backend will create the user document when /api/data is called
    if (!this.currentUser) return;
    // User document will be created by backend on first API call
  }

  /**
   * Get Firebase ID token for API authentication.
   */
  private async getIdToken(): Promise<string> {
    if (!this.firebaseUser) {
      throw new Error('Not authenticated');
    }
    return this.firebaseUser.getIdToken();
  }

  /**
   * Make authenticated API request to backend.
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Load all user data from backend.
   * The backend aggregates data from Firestore collections.
   */
  async loadData(): Promise<MomentumData> {
    return this.apiRequest<MomentumData>('/api/data');
  }

  /**
   * Load only epics (with their directives) — no logs.
   * Used for fast initial render.
   */
  async loadEpics(): Promise<Epic[]> {
    return this.apiRequest<Epic[]>('/api/epics');
  }

  /**
   * Load logs, optionally filtered by epic and/or date window.
   */
  async loadLogs(options?: { epicId?: string; days?: number }): Promise<Log[]> {
    const params = new URLSearchParams();
    if (options?.epicId) params.set('epic_id', options.epicId);
    if (options?.days !== undefined) params.set('days', String(options.days));
    const query = params.toString();
    return this.apiRequest<Log[]>(`/api/logs${query ? '?' + query : ''}`);
  }

  /**
   * Save is not needed - individual operations handle persistence.
   */
  async saveData(_data: MomentumData): Promise<void> {
    // No-op: backend_v2 uses individual CRUD operations
    console.log('saveData called but not needed with Firestore backend');
  }

  /**
   * Add a new epic.
   */
  async addEpic(epic: Omit<Epic, 'id' | 'createdAt' | 'directives'>): Promise<Epic> {
    return this.apiRequest<Epic>('/api/epics', {
      method: 'POST',
      body: JSON.stringify(epic),
    });
  }

  /**
   * Update an existing epic.
   */
  async updateEpic(epicId: string, updates: Partial<Epic>): Promise<void> {
    await this.apiRequest<Epic>(`/api/epics/${epicId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete an epic and all its directives/logs.
   */
  async deleteEpic(epicId: string): Promise<void> {
    await this.apiRequest(`/api/epics/${epicId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Add a new directive within an epic.
   */
  async addDirective(
    epicId: string,
    directive: Omit<Directive, 'id' | 'createdAt'>
  ): Promise<Directive> {
    return this.apiRequest<Directive>(`/api/epics/${epicId}/directives`, {
      method: 'POST',
      body: JSON.stringify(directive),
    });
  }

  /**
   * Update a directive.
   */
  async updateDirective(
    epicId: string,
    directiveId: string,
    updates: Partial<Directive>
  ): Promise<void> {
    await this.apiRequest<Directive>(
      `/api/epics/${epicId}/directives/${directiveId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * Delete a directive.
   */
  async deleteDirective(epicId: string, directiveId: string): Promise<void> {
    await this.apiRequest(`/api/epics/${epicId}/directives/${directiveId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Add a new log/check-in entry.
   */
  async addLog(log: Omit<Log, 'id'>): Promise<Log> {
    return this.apiRequest<Log>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  /**
   * Delete a log entry.
   */
  async deleteLog(logId: string): Promise<void> {
    await this.apiRequest(`/api/logs/${logId}`, {
      method: 'DELETE',
    });
  }
}

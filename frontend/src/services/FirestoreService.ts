import type { MomentumData, Epic, Directive, Log, User } from '../lib/types';
import type { DataService } from './DataService';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  Auth,
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';

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
  private db: Firestore | null = null;
  private currentUser: User | null = null;
  private firebaseUser: FirebaseUser | null = null;

  constructor() {
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
    this.db = getFirestore(this.app);
  }

  /**
   * Restore session from Firebase Auth state.
   */
  private restoreSession(): void {
    if (!this.auth) return;

    // Listen for auth state changes
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
    });
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
   */
  private async ensureUserDocument(): Promise<void> {
    if (!this.db || !this.currentUser) return;

    const userRef = doc(this.db, 'users', this.currentUser.id);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        name: this.currentUser.name,
        email: this.currentUser.email,
        createdAt: Timestamp.now(),
      });
    }
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
   * Save is not needed - individual operations handle persistence.
   */
  async saveData(data: MomentumData): Promise<void> {
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

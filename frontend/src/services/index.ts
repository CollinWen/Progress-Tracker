import type { DataService } from './DataService';
import { LocalStorageService } from './LocalStorageService';
import { FirestoreService } from './FirestoreService';

let activeService: DataService | null = null;

/**
 * Get the active data service.
 * Defaults to FirestoreService for production use.
 * Can be switched to LocalStorageService for demo mode.
 */
export function getDataService(): DataService {
  if (!activeService) {
    // Check if user prefers demo mode
    const useDemoMode = localStorage.getItem('useDemoMode') === 'true';

    if (useDemoMode) {
      activeService = new LocalStorageService();
    } else {
      // Default to FirestoreService
      activeService = new FirestoreService();
    }
  }
  return activeService;
}

/**
 * Switch to Firestore service (production mode).
 */
export function switchToFirestore(): void {
  activeService = new FirestoreService();
  localStorage.removeItem('useDemoMode');
}

/**
 * Switch to localStorage service (demo mode).
 */
export function switchToDemoMode(): void {
  activeService = new LocalStorageService();
  localStorage.setItem('useDemoMode', 'true');
}

/**
 * Reset the active service (useful for testing or switching modes).
 */
export function resetService(): void {
  activeService = null;
}

import type { DataService } from './DataService';
import { LocalStorageService } from './LocalStorageService';
import { GoogleDriveService } from './GoogleDriveService';

let activeService: DataService | null = null;

/**
 * Get the active data service.
 * Defaults to GoogleDriveService for production use.
 * Can be switched to LocalStorageService for demo mode.
 */
export function getDataService(): DataService {
  if (!activeService) {
    // Check if user prefers demo mode
    const useDemoMode = localStorage.getItem('useDemoMode') === 'true';

    if (useDemoMode) {
      activeService = new LocalStorageService();
    } else {
      // Default to GoogleDriveService
      activeService = new GoogleDriveService();
    }
  }
  return activeService;
}

/**
 * Switch to Google Drive service (production mode).
 */
export function switchToGoogleDrive(): void {
  activeService = new GoogleDriveService();
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

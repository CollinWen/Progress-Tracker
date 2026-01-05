import { useState, useEffect } from 'react';
import type { MomentumData, Log, Epic } from '../lib/types';
import { generateSeedData } from '../lib/computeDerivedData';

const STORAGE_KEY = 'momentum_data';

/**
 * Custom hook for managing Momentum data with localStorage persistence
 */
export function useMomentumData() {
  const [data, setData] = useState<MomentumData>(() => {
    // Initialize from localStorage or use seed data
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored data:', e);
        return generateSeedData();
      }
    }
    return generateSeedData();
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  /**
   * Add a new log entry
   */
  const addLog = (log: Omit<Log, 'id'>) => {
    const newLog: Log = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setData(prev => ({
      ...prev,
      logs: [...prev.logs, newLog],
    }));

    return newLog;
  };

  /**
   * Update an existing epic
   */
  const updateEpic = (epicId: string, updates: Partial<Epic>) => {
    setData(prev => ({
      ...prev,
      epics: prev.epics.map(epic =>
        epic.id === epicId ? { ...epic, ...updates } : epic
      ),
    }));
  };

  /**
   * Update epic target progress
   */
  const updateEpicTarget = (epicId: string, current: number) => {
    setData(prev => ({
      ...prev,
      epics: prev.epics.map(epic =>
        epic.id === epicId && epic.target
          ? { ...epic, target: { ...epic.target, current } }
          : epic
      ),
    }));
  };

  /**
   * Reset to initial seed data (useful for testing)
   */
  const resetData = () => {
    const seedData = generateSeedData();
    setData(seedData);
  };

  /**
   * Clear all data
   */
  const clearData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(generateSeedData());
  };

  return {
    data,
    addLog,
    updateEpic,
    updateEpicTarget,
    resetData,
    clearData,
  };
}

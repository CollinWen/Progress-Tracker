import type {
  MomentumData,
  Epic,
  Directive,
  Log,
  DirectiveStats,
  EpicStats,
  CheckinInterval,
  SuggestedAction,
  Phase,
  ActivityType,
} from './types';

/**
 * Calculate days since a given ISO date string
 */
function daysSince(isoDate: string): number {
  const date = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if an epic is overdue for a check-in based on its interval and last check-in
 */
function isEpicOverdue(lastCheckin: string | null, interval: CheckinInterval): boolean {
  if (!lastCheckin) return true;

  const days = daysSince(lastCheckin);

  switch (interval) {
    case 'daily':
      return days > 1;
    case 'weekly':
      return days > 7;
    case 'biweekly':
      return days > 14;
    case 'monthly':
      return days > 30;
    default:
      return false;
  }
}

/**
 * Calculate the phase of an epic based on recent activity patterns
 *
 * Phase logic:
 * - exploring: Little to no activity (< 10% recent density)
 * - building: Moderate activity, ramping up (10-30% recent density)
 * - active: High activity (> 30% recent density)
 * - refining: Declining activity from peak (was active, now moderate)
 * - paused: No activity in last 30 days
 */
export function computeEpicPhase(
  epic: Epic,
  logs: Log[]
): Phase {
  const epicLogs = logs.filter(log => log.epicId === epic.id);

  // Check if paused (no activity in 30 days)
  if (epicLogs.length > 0) {
    const lastLog = epicLogs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    const daysSinceLastActivity = daysSince(lastLog.timestamp);

    if (daysSinceLastActivity > 30) {
      return 'paused';
    }
  } else {
    // No logs at all
    return 'exploring';
  }

  // Calculate activity density over different time windows
  const now = new Date();

  // Last 14 days
  const last14DaysActivity: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const hasActivity = epicLogs.some(log =>
      log.timestamp.split('T')[0] === dateString
    );

    last14DaysActivity.push(hasActivity ? 1 : 0);
  }

  // Previous 14 days (days 15-28)
  const previous14DaysActivity: number[] = [];
  for (let i = 27; i >= 14; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const hasActivity = epicLogs.some(log =>
      log.timestamp.split('T')[0] === dateString
    );

    previous14DaysActivity.push(hasActivity ? 1 : 0);
  }

  const recentDensity = (last14DaysActivity.reduce((a, b) => a + b, 0) / 14) * 100;
  const previousDensity = (previous14DaysActivity.reduce((a, b) => a + b, 0) / 14) * 100;

  // Determine phase based on density and trend
  if (recentDensity < 10) {
    return 'exploring';
  } else if (recentDensity > 40) {
    return 'active';
  } else if (recentDensity > previousDensity + 10) {
    // Ramping up
    return 'building';
  } else if (previousDensity > 40 && recentDensity < previousDensity) {
    // Coming down from peak
    return 'refining';
  } else if (recentDensity >= 10 && recentDensity <= 30) {
    return 'building';
  } else {
    // Default for moderate activity
    return 'building';
  }
}

/**
 * Get unique dates from an array of logs
 */
function getUniqueDates(logs: Log[]): string[] {
  const dates = logs.map(log => log.timestamp.split('T')[0]);
  return Array.from(new Set(dates));
}

/**
 * Compute statistics for a single directive
 * Note: isOverdue is now based on epic's checkin interval, not directive's
 */
export function computeDirectiveStats(
  directive: Directive,
  logs: Log[],
  epicCheckinInterval?: CheckinInterval
): DirectiveStats {
  const directiveLogs = logs.filter(log => log.directiveId === directive.id);

  const daysActive = getUniqueDates(directiveLogs).length;

  const hoursLogged = directiveLogs.reduce((sum, log) => {
    return sum + (log.durationMinutes || 0) / 60;
  }, 0);

  const lastCheckin = directiveLogs.length > 0
    ? directiveLogs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0].timestamp
    : null;

  // If epic checkin interval provided, use it; otherwise default to not overdue
  const isOverdue = epicCheckinInterval
    ? isEpicOverdue(lastCheckin, epicCheckinInterval)
    : false;

  return {
    daysActive,
    hoursLogged,
    lastCheckin,
    isOverdue,
  };
}

/**
 * Compute statistics for a single epic
 */
export function computeEpicStats(
  epic: Epic,
  logs: Log[]
): EpicStats {
  const epicLogs = logs.filter(log => log.epicId === epic.id);

  // Calculate total days and hours across all directives
  const directiveStats = epic.directives.map(d =>
    computeDirectiveStats(d, logs, epic.checkinInterval)
  );

  const totalDaysInvested = directiveStats.reduce((sum, stats) => sum + stats.daysActive, 0);
  const totalHoursLogged = directiveStats.reduce((sum, stats) => sum + stats.hoursLogged, 0);

  // Generate commit history for last 52 days
  const commitHistory: number[] = [];
  const now = new Date();

  for (let i = 51; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const hasActivity = epicLogs.some(log =>
      log.timestamp.split('T')[0] === dateString
    );

    commitHistory.push(hasActivity ? 1 : 0);
  }

  // Calculate recent density (last 14 days)
  const last14Days = commitHistory.slice(-14);
  const recentDensity = Math.round(
    (last14Days.reduce((a, b) => a + b, 0) / 14) * 100
  );

  // Compute phase based on activity
  const phase = computeEpicPhase(epic, logs);

  return {
    totalDaysInvested,
    totalHoursLogged,
    commitHistory,
    recentDensity,
    phase,
  };
}

/**
 * Get suggested actions (mix of neglected and high-momentum directives)
 */
export function getSuggestedActions(
  data: MomentumData,
  maxActions: number = 4
): SuggestedAction[] {
  const allDirectivesWithContext = data.epics.flatMap(epic =>
    epic.directives.map(directive => {
      const stats = computeDirectiveStats(directive, data.logs, epic.checkinInterval);
      return {
        directive,
        epic,
        stats,
      };
    })
  );

  // Find neglected directives (based on epic's check-in interval)
  const neglected = allDirectivesWithContext
    .filter(({ stats, epic }) => {
      if (!stats.lastCheckin) return true;
      const days = daysSince(stats.lastCheckin);
      return (
        (epic.checkinInterval === 'daily' && days > 2) ||
        (epic.checkinInterval === 'weekly' && days > 10) ||
        (epic.checkinInterval === 'biweekly' && days > 18) ||
        (epic.checkinInterval === 'monthly' && days > 40)
      );
    })
    .sort((a, b) => {
      // Sort by days since last check-in (most neglected first)
      const aDays = a.stats.lastCheckin ? daysSince(a.stats.lastCheckin) : 999;
      const bDays = b.stats.lastCheckin ? daysSince(b.stats.lastCheckin) : 999;
      return bDays - aDays;
    })
    .slice(0, 2)
    .map(item => ({
      ...item,
      reason: 'neglected' as const,
    }));

  // Find high-momentum directives (most days active)
  const momentum = allDirectivesWithContext
    .filter(({ stats }) => stats.daysActive > 5)
    .sort((a, b) => b.stats.daysActive - a.stats.daysActive)
    .slice(0, maxActions - neglected.length)
    .map(item => ({
      ...item,
      reason: 'momentum' as const,
    }));

  return [...neglected, ...momentum];
}

/**
 * Generate initial seed data based on the spec
 */
export function generateSeedData(): MomentumData {
  const now = new Date();
  const startOfYear = '2025-01-01';

  return {
    version: 1,
    user: {
      id: 'user_seed',
      name: 'Collin',
      email: '',
      createdAt: startOfYear,
    },
    epics: [
      {
        id: 'epic_001',
        name: 'Lighting Business',
        color: '#4a7171',
        description: 'Computational paper lamps → market',
        checkinInterval: 'weekly',
        createdAt: startOfYear,
        deadline: null,
        target: null,
        directives: [
          {
            id: 'dir_001',
            name: 'Assembly mechanism R&D',
            type: 'build',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_002',
            name: 'Unfolding algorithm',
            type: 'build',
            progressType: 'task',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_003',
            name: 'Market & pricing research',
            type: 'research',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_004',
            name: 'Store setup & fulfillment',
            type: 'arrange',
            progressType: 'task',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_002',
        name: 'Race Season 2025',
        color: '#5c8a6e',
        description: 'Half marathon + triathlon',
        checkinInterval: 'weekly',
        createdAt: startOfYear,
        deadline: '2025-06-15',
        target: {
          current: 0,
          total: 2,
          unit: 'races',
        },
        directives: [
          {
            id: 'dir_005',
            name: 'Structured training',
            type: 'train',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_006',
            name: 'FTP & performance tracking',
            type: 'research',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_007',
            name: 'Race registration & logistics',
            type: 'arrange',
            progressType: 'task',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_003',
        name: 'Deep Reading',
        color: '#8a7f72',
        description: 'Books + academic papers',
        checkinInterval: 'daily',
        createdAt: startOfYear,
        deadline: null,
        target: {
          current: 1,
          total: 5,
          unit: 'books',
        },
        directives: [
          {
            id: 'dir_008',
            name: 'Book reading',
            type: 'learn',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_009',
            name: 'Paper reading (3-4/month)',
            type: 'learn',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_004',
        name: 'Side Projects',
        color: '#7171a8',
        description: '4 meaningful builds this year',
        checkinInterval: 'weekly',
        createdAt: startOfYear,
        deadline: null,
        target: {
          current: 0,
          total: 4,
          unit: 'projects',
        },
        directives: [
          {
            id: 'dir_010',
            name: 'This app (Momentum)',
            type: 'build',
            progressType: 'task',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_011',
            name: 'Project ideation',
            type: 'plan',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_005',
        name: 'Academic Course',
        color: '#a87171',
        description: 'Complete one structured course',
        checkinInterval: 'monthly',
        createdAt: startOfYear,
        deadline: null,
        target: {
          current: 0,
          total: 1,
          unit: 'course',
        },
        directives: [
          {
            id: 'dir_012',
            name: 'Course selection',
            type: 'research',
            progressType: 'task',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_013',
            name: 'Weekly lessons',
            type: 'learn',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_006',
        name: 'Daily Practice',
        color: '#a8a371',
        description: 'Chinese, cooking, screen discipline',
        checkinInterval: 'daily',
        createdAt: startOfYear,
        deadline: null,
        target: null,
        directives: [
          {
            id: 'dir_014',
            name: 'Chinese practice',
            type: 'learn',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_015',
            name: 'Cooking (3x/week)',
            type: 'build',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
          {
            id: 'dir_016',
            name: 'Screen time review',
            type: 'plan',
            progressType: 'ongoing',
            isComplete: false,
            createdAt: startOfYear,
          },
        ],
      },
    ],
    logs: [
      // Sample logs to show activity patterns
      {
        id: 'log_001',
        epicId: 'epic_001',
        directiveId: 'dir_001',
        timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 60,
        sessionType: 'blocked',
        note: 'Worked on hinge mechanism, tried 3 different approaches',
        source: 'manual',
      },
      {
        id: 'log_002',
        epicId: 'epic_002',
        directiveId: 'dir_005',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 90,
        sessionType: 'deep',
        note: '10K run + strength training',
        source: 'manual',
      },
      {
        id: 'log_003',
        epicId: 'epic_003',
        directiveId: 'dir_008',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
        sessionType: 'blocked',
        note: 'Read chapters 4-5 of Atomic Habits',
        source: 'manual',
      },
      {
        id: 'log_004',
        epicId: 'epic_004',
        directiveId: 'dir_010',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 120,
        sessionType: 'deep',
        note: 'Built UI components for Momentum app',
        source: 'manual',
      },
    ],
  };
}

// One entry per day; each entry maps epicId → 1 (active) or 0 (not active)
export interface DailyMomentumEntry {
  date: string; // YYYY-MM-DD
  epicActivity: Record<string, number>;
  totalActive: number; // how many epics had activity that day
  totalHours: number; // sum of durationMinutes / 60 for all logs that day
  epicHours: Record<string, number>; // hours per epic that day
}

/**
 * Build a day-by-day breakdown of activity across all epics for the last N days.
 * Used by the unified MomentumGraph visualization.
 */
export function getDailyMomentum(data: MomentumData, days: number = 30): DailyMomentumEntry[] {
  const now = new Date();
  const result: DailyMomentumEntry[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const epicActivity: Record<string, number> = {};
    const epicHours: Record<string, number> = {};
    let totalActive = 0;
    let totalHours = 0;

    for (const epic of data.epics) {
      const dayLogs = data.logs.filter(
        log => log.epicId === epic.id && log.timestamp.split('T')[0] === dateString
      );
      const active = dayLogs.length > 0 ? 1 : 0;
      const hours = dayLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / 60;
      epicActivity[epic.id] = active;
      epicHours[epic.id] = hours;
      totalActive += active;
      totalHours += hours;
    }

    result.push({ date: dateString, epicActivity, epicHours, totalActive, totalHours });
  }

  return result;
}

/**
 * Compute the current activity streak (consecutive days with any log).
 * If nothing logged today, counts back from yesterday.
 */
export function computeStreak(logs: Log[]): number {
  const activeDates = new Set(logs.map(l => l.timestamp.split('T')[0]));
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const checkDate = new Date(today);
  if (!activeDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activeDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Total hours logged in the last 7 days (rounded to 1 decimal).
 */
export function computeWeeklyHours(logs: Log[]): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  cutoff.setHours(0, 0, 0, 0);
  const total = logs
    .filter(l => new Date(l.timestamp) >= cutoff)
    .reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
  return Math.round((total / 60) * 10) / 10;
}

/**
 * Break down total logged minutes by ActivityType across all directives.
 * Logs with no durationMinutes are counted as 0.
 */
export function computeActivityBreakdown(data: MomentumData): Record<ActivityType, number> {
  const breakdown: Record<ActivityType, number> = {
    build: 0, learn: 0, train: 0, research: 0, plan: 0, arrange: 0,
  };
  for (const log of data.logs) {
    const epic = data.epics.find(e => e.id === log.epicId);
    if (!epic) continue;
    const directive = epic.directives.find(d => d.id === log.directiveId);
    if (!directive) continue;
    breakdown[directive.type] += (log.durationMinutes || 0);
  }
  return breakdown;
}

/**
 * Average recentDensity across epics that have any log history.
 */
export function computeOverallConsistency(data: MomentumData): number {
  const activeEpics = data.epics.filter(e =>
    data.logs.some(l => l.epicId === e.id)
  );
  if (!activeEpics.length) return 0;
  const total = activeEpics.reduce((sum, e) => sum + computeEpicStats(e, data.logs).recentDensity, 0);
  return Math.round(total / activeEpics.length);
}

/**
 * Count unique days with any logged activity in the current calendar month.
 */
export function countActiveDaysThisMonth(logs: Log[]): number {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const activeDates = new Set(
    logs
      .filter(log => log.timestamp.startsWith(monthPrefix))
      .map(log => log.timestamp.split('T')[0])
  );
  return activeDates.size;
}

/**
 * Filter logs by epic, directive, and/or text search
 */
export function filterLogs(
  logs: Log[],
  filters: {
    epicId?: string;
    directiveId?: string;
    searchText?: string;
  }
): Log[] {
  return logs.filter((log) => {
    // Filter by epic
    if (filters.epicId && log.epicId !== filters.epicId) return false;

    // Filter by directive
    if (filters.directiveId && log.directiveId !== filters.directiveId)
      return false;

    // Filter by text search (case-insensitive)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      return log.note.toLowerCase().includes(searchLower);
    }

    return true;
  });
}

/**
 * Group logs by date (most recent first)
 */
export function groupLogsByDate(logs: Log[]): Map<string, Log[]> {
  const grouped = new Map<string, Log[]>();

  // Sort logs by timestamp descending
  const sorted = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  sorted.forEach((log) => {
    const date = log.timestamp.split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(log);
  });

  return grouped;
}

/**
 * Format ISO date to readable format (e.g., "January 4, 2025")
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get relative date label (e.g., "Today", "Yesterday", or formatted date)
 */
export function getRelativeDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateString = date.toISOString().split('T')[0];
  const todayString = today.toISOString().split('T')[0];
  const yesterdayString = yesterday.toISOString().split('T')[0];

  if (dateString === todayString) return 'Today';
  if (dateString === yesterdayString) return 'Yesterday';

  return formatDate(isoDate);
}

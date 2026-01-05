import type {
  MomentumData,
  Epic,
  Directive,
  Log,
  DirectiveStats,
  EpicStats,
  CheckinInterval,
  SuggestedAction
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
 * Check if a directive is overdue based on its interval and last check-in
 */
function isDirectiveOverdue(lastCheckin: string | null, interval: CheckinInterval): boolean {
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
 * Get unique dates from an array of logs
 */
function getUniqueDates(logs: Log[]): string[] {
  const dates = logs.map(log => log.timestamp.split('T')[0]);
  return Array.from(new Set(dates));
}

/**
 * Compute statistics for a single directive
 */
export function computeDirectiveStats(
  directive: Directive,
  logs: Log[]
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

  const isOverdue = isDirectiveOverdue(lastCheckin, directive.interval);

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
  const directiveStats = epic.directives.map(d => computeDirectiveStats(d, logs));

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

  return {
    totalDaysInvested,
    totalHoursLogged,
    commitHistory,
    recentDensity,
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
      const stats = computeDirectiveStats(directive, data.logs);
      return {
        directive,
        epic,
        stats,
      };
    })
  );

  // Find neglected directives (overdue or never started)
  const neglected = allDirectivesWithContext
    .filter(({ stats, directive }) => {
      if (!stats.lastCheckin) return true;
      const days = daysSince(stats.lastCheckin);
      return (
        (directive.interval === 'daily' && days > 2) ||
        (directive.interval === 'weekly' && days > 10) ||
        (directive.interval === 'biweekly' && days > 18) ||
        (directive.interval === 'monthly' && days > 40)
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
      name: 'Collin',
      createdAt: startOfYear,
    },
    epics: [
      {
        id: 'epic_001',
        name: 'Lighting Business',
        emoji: '💡',
        description: 'Computational paper lamps → market',
        phase: 'building',
        createdAt: startOfYear,
        deadline: null,
        target: null,
        directives: [
          {
            id: 'dir_001',
            name: 'Assembly mechanism R&D',
            type: 'build',
            interval: 'weekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_002',
            name: 'Unfolding algorithm',
            type: 'build',
            interval: 'weekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_003',
            name: 'Market & pricing research',
            type: 'research',
            interval: 'biweekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_004',
            name: 'Store setup & fulfillment',
            type: 'arrange',
            interval: 'monthly',
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_002',
        name: 'Race Season 2025',
        emoji: '🏃',
        description: 'Half marathon + triathlon',
        phase: 'active',
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
            interval: 'weekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_006',
            name: 'FTP & performance tracking',
            type: 'research',
            interval: 'biweekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_007',
            name: 'Race registration & logistics',
            type: 'arrange',
            interval: 'monthly',
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_003',
        name: 'Deep Reading',
        emoji: '📖',
        description: 'Books + academic papers',
        phase: 'active',
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
            interval: 'daily',
            createdAt: startOfYear,
          },
          {
            id: 'dir_009',
            name: 'Paper reading (3-4/month)',
            type: 'learn',
            interval: 'weekly',
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_004',
        name: 'Side Projects',
        emoji: '⚡',
        description: '4 meaningful builds this year',
        phase: 'exploring',
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
            interval: 'weekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_011',
            name: 'Project ideation',
            type: 'plan',
            interval: 'biweekly',
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_005',
        name: 'Academic Course',
        emoji: '🎓',
        description: 'Complete one structured course',
        phase: 'paused',
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
            interval: 'monthly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_013',
            name: 'Weekly lessons',
            type: 'learn',
            interval: 'weekly',
            createdAt: startOfYear,
          },
        ],
      },
      {
        id: 'epic_006',
        name: 'Daily Practice',
        emoji: '🌱',
        description: 'Chinese, cooking, screen discipline',
        phase: 'active',
        createdAt: startOfYear,
        deadline: null,
        target: null,
        directives: [
          {
            id: 'dir_014',
            name: 'Chinese practice',
            type: 'learn',
            interval: 'daily',
            createdAt: startOfYear,
          },
          {
            id: 'dir_015',
            name: 'Cooking (3x/week)',
            type: 'build',
            interval: 'weekly',
            createdAt: startOfYear,
          },
          {
            id: 'dir_016',
            name: 'Screen time review',
            type: 'plan',
            interval: 'daily',
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
        note: 'Worked on hinge mechanism, tried 3 different approaches',
        source: 'manual',
      },
      {
        id: 'log_002',
        epicId: 'epic_002',
        directiveId: 'dir_005',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 90,
        note: '10K run + strength training',
        source: 'manual',
      },
      {
        id: 'log_003',
        epicId: 'epic_003',
        directiveId: 'dir_008',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 45,
        note: 'Read chapters 4-5 of Atomic Habits',
        source: 'manual',
      },
      {
        id: 'log_004',
        epicId: 'epic_004',
        directiveId: 'dir_010',
        timestamp: new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 120,
        note: 'Built UI components for Momentum app',
        source: 'manual',
      },
    ],
  };
}

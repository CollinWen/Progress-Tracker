import type { Directive, ActivityType } from '../lib/types';
import type { DirectiveStats } from '../lib/types';

interface DirectiveRowProps {
  directive: Directive;
  stats: DirectiveStats;
  epicEmoji: string;
  onLog: () => void;
}

const activityTypes: Record<
  ActivityType,
  { label: string; emoji: string; color: string }
> = {
  build: { label: 'Build', emoji: '🛠', color: '#2d2d2d' },
  learn: { label: 'Learn', emoji: '📚', color: '#2d2d2d' },
  train: { label: 'Train', emoji: '💪', color: '#2d2d2d' },
  research: { label: 'Research', emoji: '🔍', color: '#2d2d2d' },
  plan: { label: 'Plan', emoji: '🎯', color: '#2d2d2d' },
  arrange: { label: 'Arrange', emoji: '📋', color: '#2d2d2d' },
};

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function DirectiveRow({ directive, stats, onLog }: DirectiveRowProps) {
  const daysSinceLastCheckin = daysSince(stats.lastCheckin);

  return (
    <div
      style={{
        padding: '18px 20px',
        backgroundColor: stats.isOverdue ? '#fffbf5' : '#fafaf8',
        borderRadius: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: stats.isOverdue ? '1px solid #f0e0c8' : '1px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '16px' }}>
          {activityTypes[directive.type].emoji}
        </span>
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#2d2d2d',
              marginBottom: '2px',
            }}
          >
            {directive.name}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: '#9a958e',
            }}
          >
            {directive.interval} check-in
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 600,
              color: '#2d2d2d',
              lineHeight: 1,
            }}
          >
            {stats.daysActive}
          </div>
          <div style={{ fontSize: '12px', color: '#9a958e' }}>days</div>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: stats.isOverdue ? '#c49a5c' : '#9a958e',
            minWidth: '55px',
            textAlign: 'right',
          }}
        >
          {daysSinceLastCheckin === null
            ? 'not yet'
            : daysSinceLastCheckin === 0
            ? 'today'
            : `${daysSinceLastCheckin}d ago`}
        </div>
        <button
          onClick={onLog}
          style={{
            padding: '10px 18px',
            backgroundColor: '#2d2d2d',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Log
        </button>
      </div>
    </div>
  );
}

import type { Directive, ActivityType } from '../lib/types';
import type { DirectiveStats } from '../lib/types';

interface DirectiveRowProps {
  directive: Directive;
  stats: DirectiveStats;
  epicEmoji: string;
  onLog: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

export function DirectiveRow({ directive, stats, onLog, onEdit, onDelete }: DirectiveRowProps) {
  const daysSinceLastCheckin = daysSince(stats.lastCheckin);

  return (
    <div
      style={{
        padding: '18px 20px',
        backgroundColor: directive.isComplete ? '#f0fdf4' : (stats.isOverdue ? '#fffbf5' : '#fafaf8'),
        borderRadius: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: directive.isComplete ? '1px solid #86efac' : (stats.isOverdue ? '1px solid #f0e0c8' : '1px solid transparent'),
        opacity: directive.isComplete ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '16px' }}>
          {directive.isComplete ? '✓' : activityTypes[directive.type].emoji}
        </span>
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: '#2d2d2d',
              marginBottom: '2px',
              textDecoration: directive.isComplete ? 'line-through' : 'none',
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
            {directive.progressType === 'task' ? (directive.isComplete ? 'Complete' : 'To-do') : 'Ongoing'}
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
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              color: '#7a756e',
              border: '1px solid #eae6e1',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete "${directive.name}"? This cannot be undone.`)) {
                onDelete();
              }
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              color: '#c53030',
              border: '1px solid #fed7d7',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        )}
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

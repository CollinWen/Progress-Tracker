import type { SuggestedAction as SuggestedActionType } from '../lib/types';

interface SuggestedActionProps {
  action: SuggestedActionType;
  onLog: () => void;
}

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function SuggestedAction({ action, onLog }: SuggestedActionProps) {
  const { directive, epic, reason, stats } = action;
  const daysSinceLastCheckin = daysSince(stats.lastCheckin);

  return (
    <div
      style={{
        padding: '22px 26px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #eae6e1',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '24px' }}>{epic.emoji}</span>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#2d2d2d',
              }}
            >
              {directive.name}
            </span>
            <span
              style={{
                padding: '4px 10px',
                backgroundColor:
                  reason === 'neglected' ? '#fff8f0' : '#f0f8f5',
                color: reason === 'neglected' ? '#c49a5c' : '#5c8a6e',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {reason === 'neglected' ? 'needs love' : 'on fire'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#9a958e' }}>
            {epic.name} ·{' '}
            {daysSinceLastCheckin === 0
              ? 'today'
              : daysSinceLastCheckin
              ? `${daysSinceLastCheckin} days ago`
              : 'not started'}
          </div>
        </div>
      </div>
      <button
        onClick={onLog}
        style={{
          padding: '12px 24px',
          backgroundColor: '#2d2d2d',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Log progress
      </button>
    </div>
  );
}

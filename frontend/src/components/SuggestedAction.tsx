import type { SuggestedAction as SuggestedActionType } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface SuggestedActionCardProps {
  action: SuggestedActionType;
  onCheckIn: () => void;
}

function daysSince(isoDate: string | null): number | null {
  const diffMs = isoDate ? Date.now() - new Date(isoDate).getTime() : null;
  return diffMs !== null ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : null;
}

function lastCheckinLabel(isoDate: string | null): string {
  const days = daysSince(isoDate);
  if (days === null) return 'not started';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function SuggestedAction({ action, onCheckIn }: SuggestedActionCardProps) {
  const { colors } = useTheme();
  const { directive, epic, reason, stats } = action;
  const onFire = reason !== 'neglected';

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: 0,
      border: `1px solid ${colors.border}`,
      borderTop: `2px solid ${epic.color}`,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: '100%',
    }}>
      {/* Status badge + rule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '9px',
          fontWeight: 700,
          color: onFire ? colors.accent : colors.warning,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          {onFire ? '◆ On fire' : '◇ Needs attention'}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: colors.borderLight }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div className="font-serif" style={{
          fontSize: '18px',
          fontWeight: 600,
          color: colors.text,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: '5px',
        }}>
          {directive.name}
        </div>
        <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.04em' }}>
          {epic.name} · {stats.daysActive}d · {lastCheckinLabel(stats.lastCheckin)}
        </div>
      </div>

      {/* Log button — square, uppercase, space-between */}
      <button
        onClick={onCheckIn}
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: colors.text,
          color: colors.surface,
          border: `1px solid ${colors.text}`,
          borderRadius: 0,
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Log progress</span>
        <span>→</span>
      </button>
    </div>
  );
}

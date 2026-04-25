import { ArrowRight } from 'lucide-react';
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

  const badge = reason === 'neglected'
    ? { bg: colors.warningBg, color: colors.warning, label: 'needs attention' }
    : { bg: colors.accentLight, color: colors.accent, label: 'on fire' };

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: '8px',
      border: `1px solid ${colors.border}`,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
        {/* Sharp color swatch */}
        <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: epic.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text, lineHeight: 1.3 }}>{directive.name}</span>
            <span style={{ padding: '2px 7px', backgroundColor: badge.bg, color: badge.color, borderRadius: '3px', fontSize: '10px', fontWeight: 700, flexShrink: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {badge.label}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: colors.textTertiary }}>
            {epic.name} · {stats.daysActive}d · {lastCheckinLabel(stats.lastCheckin)}
          </div>
        </div>
      </div>

      <button
        onClick={onCheckIn}
        style={{
          width: '100%',
          padding: '11px',
          backgroundColor: colors.text,
          color: colors.surface,
          border: 'none',
          borderRadius: '5px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          letterSpacing: '0.01em',
        }}
      >
        Log progress <ArrowRight size={13} />
      </button>
    </div>
  );
}

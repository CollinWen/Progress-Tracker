import { Paperclip } from 'lucide-react';
import type { Directive, DirectiveStats } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface DirectiveRowProps {
  directive: Directive;
  stats: DirectiveStats;
  epicColor: string;
  onLog: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  return Math.floor((new Date().getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function lastCheckinLabel(days: number | null): string {
  if (days === null) return 'not yet';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function DirectiveRow({ directive, stats, epicColor, onLog, onEdit, onDelete }: DirectiveRowProps) {
  const { colors } = useTheme();
  const daysSinceLastCheckin = daysSince(stats.lastCheckin);
  const complete = directive.isComplete;
  const overdue = stats.isOverdue;

  const rowBg = complete ? colors.hover : overdue ? colors.warningBg : colors.surface;
  const borderColor = complete ? colors.border : overdue ? colors.border : colors.borderLight;
  const accentBorder = complete ? colors.inactive : overdue ? colors.warning : epicColor;

  const kindLabel = complete ? 'DONE' : directive.progressType === 'task' ? 'TASK' : 'HABIT';

  return (
    <div style={{
      padding: '13px 14px',
      backgroundColor: rowBg,
      border: `1px solid ${borderColor}`,
      borderLeft: `2px solid ${accentBorder}`,
      borderRadius: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: complete ? 0.7 : 1,
    }}>
      {/* Left: kind label + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '9px',
          fontWeight: 700,
          color: colors.textTertiary,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          minWidth: '40px',
          flexShrink: 0,
        }}>
          {kindLabel}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text,
            textDecoration: complete ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {directive.name}
          </div>
          {directive.attachments && directive.attachments.length > 0 && (
            <div style={{ fontSize: '11px', color: colors.textTertiary, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
              <Paperclip size={10} />
              <span>{directive.attachments.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: stat + last checkin + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
        {/* Days stat */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {stats.daysActive}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Days
          </div>
        </div>

        {/* Last checkin */}
        <div style={{
          fontSize: '11px',
          color: overdue ? colors.warning : colors.textTertiary,
          minWidth: '52px',
          textAlign: 'right',
          fontWeight: overdue ? 600 : 400,
        }}>
          {lastCheckinLabel(daysSinceLastCheckin)}
        </div>

        {/* Edit / Delete */}
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { if (confirm(`Delete "${directive.name}"? This cannot be undone.`)) onDelete!(); }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: colors.danger,
              border: `1px solid ${colors.dangerBorder}`,
              borderRadius: 0,
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Delete
          </button>
        )}

        {/* Log button */}
        {!complete && (
          <button
            onClick={onLog}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.text,
              color: colors.surface,
              border: `1px solid ${colors.text}`,
              borderRadius: 0,
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Log
          </button>
        )}
      </div>
    </div>
  );
}

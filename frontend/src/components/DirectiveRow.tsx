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

export function DirectiveRow({ directive, stats, epicColor, onLog, onEdit, onDelete }: DirectiveRowProps) {
  const { colors } = useTheme();
  const daysSinceLastCheckin = daysSince(stats.lastCheckin);

  const rowBg = directive.isComplete
    ? colors.accentLight
    : stats.isOverdue
    ? colors.warningBg
    : colors.hover;

  const rowBorder = directive.isComplete
    ? `1px solid ${colors.accent}22`
    : stats.isOverdue
    ? `1px solid ${colors.warning}33`
    : '1px solid transparent';

  return (
    <div style={{
      padding: '14px 16px',
      backgroundColor: rowBg,
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: rowBorder,
      opacity: directive.isComplete ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '1px', backgroundColor: directive.isComplete ? colors.accent : epicColor, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: colors.text, marginBottom: '1px', textDecoration: directive.isComplete ? 'line-through' : 'none' }}>
            {directive.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '12px', color: colors.textTertiary }}>
              {directive.progressType === 'task' ? (directive.isComplete ? 'Complete' : 'To-do') : 'Ongoing'}
            </div>
            {directive.attachments && directive.attachments.length > 0 && (
              <div style={{ fontSize: '11px', color: colors.textTertiary, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Paperclip size={10} />
                <span>{directive.attachments.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: colors.text, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {stats.daysActive}
          </div>
          <div style={{ fontSize: '11px', color: colors.textTertiary, letterSpacing: '0.02em' }}>days</div>
        </div>
        <div style={{ fontSize: '12px', color: stats.isOverdue ? colors.warning : colors.textTertiary, minWidth: '52px', textAlign: 'right' }}>
          {daysSinceLastCheckin === null ? 'not yet' : daysSinceLastCheckin === 0 ? 'today' : `${daysSinceLastCheckin}d ago`}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => { if (confirm(`Delete "${directive.name}"? This cannot be undone.`)) onDelete!(); }}
            style={{ padding: '6px 12px', backgroundColor: 'transparent', color: colors.danger, border: `1px solid ${colors.dangerBorder}`, borderRadius: '5px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
          >
            Delete
          </button>
        )}
        <button
          onClick={onLog}
          style={{ padding: '8px 16px', backgroundColor: colors.text, color: colors.surface, border: 'none', borderRadius: '5px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}
        >
          Log
        </button>
      </div>
    </div>
  );
}

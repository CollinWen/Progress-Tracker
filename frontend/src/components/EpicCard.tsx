import { useNavigate } from 'react-router-dom';
import { ChevronDown, Paperclip } from 'lucide-react';
import type { Epic, Log, Directive } from '../lib/types';
import { computeDirectiveStats, computeEpicStats } from '../lib/computeDerivedData';
import { PhaseBadge } from './PhaseBadge';
import { CommitGraph } from './CommitGraph';
import { DirectiveRow } from './DirectiveRow';
import { DropdownMenu } from './DropdownMenu';
import { useTheme } from '../contexts/ThemeContext';

interface EpicCardProps {
  epic: Epic;
  logs: Log[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onCheckIn: (directiveId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddDirective?: () => void;
  onEditDirective?: (directive: Directive) => void;
  onDeleteDirective?: (directiveId: string) => void;
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function deadlineColor(days: number): { bg: string; color: string } {
  if (days <= 14) return { bg: '#fdecea', color: '#b52a2a' };
  if (days <= 30) return { bg: '#fff3e0', color: '#a07840' };
  if (days <= 60) return { bg: '#fff8e1', color: '#9a7830' };
  return { bg: '#f0ece8', color: '#7a7570' };
}

interface ProgressRingProps {
  current: number;
  total: number;
  unit: string;
  color: string;
}

function ProgressRing({ current, total, unit, color }: ProgressRingProps) {
  const { colors } = useTheme();
  const SIZE = 52;
  const STROKE = 3;
  const r = (SIZE - STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(current / total, 1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={SIZE} height={SIZE}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={colors.graphEmpty} strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={r}
          fill="none" stroke={color} strokeWidth={STROKE}
          strokeDasharray={circ} strokeDashoffset={circ - pct * circ}
          strokeLinecap="square"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={colors.text} fontFamily="inherit">
          {current}/{total}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 8} textAnchor="middle" fontSize="8" fill={colors.textTertiary} fontFamily="inherit">
          {unit}
        </text>
      </svg>
    </div>
  );
}

export function EpicCard({
  epic, logs, isExpanded, onToggleExpanded, onCheckIn,
  onEdit, onDelete, onAddDirective, onEditDirective, onDeleteDirective,
}: EpicCardProps) {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const epicStats = computeEpicStats(epic, logs);
  const directiveStats = epic.directives.map((d) => computeDirectiveStats(d, logs, epic.checkinInterval));
  const totalDays = directiveStats.reduce((sum, s) => sum + s.daysActive, 0);
  const daysRemaining = daysUntil(epic.deadline);

  const menuItems = [
    { label: 'View Details', onClick: () => navigate(`/epic/${epic.id}`) },
    ...(onEdit ? [{ label: 'Edit', onClick: onEdit }] : []),
    ...(onDelete ? [{
      label: 'Delete',
      onClick: () => { if (confirm(`Delete "${epic.name}"? This cannot be undone.`)) onDelete!(); },
      variant: 'danger' as const,
    }] : []),
  ];

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: '10px',
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      borderLeft: `3px solid ${epic.color}`,
    }}>
      <div onClick={onToggleExpanded} style={{ padding: '22px 24px', cursor: 'pointer' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            {/* Color block — rectangular, sharp */}
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', backgroundColor: epic.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h2 className="font-serif" style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: colors.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  {epic.name}
                </h2>
                <PhaseBadge phase={epicStats.phase} />
                <DropdownMenu items={menuItems} />
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5, marginBottom: epic.tags && epic.tags.length > 0 ? '8px' : 0 }}>
                {epic.description}
                {daysRemaining !== null && (
                  <span style={{ marginLeft: '8px', padding: '2px 7px', borderRadius: '3px', fontSize: '11px', fontWeight: 600, ...deadlineColor(daysRemaining) }}>
                    {daysRemaining <= 0 ? 'overdue' : `${daysRemaining}d left`}
                  </span>
                )}
              </p>
              {epic.tags && epic.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {epic.tags.map((tag) => (
                    <span key={tag} style={{ padding: '3px 8px', backgroundColor: colors.tagBg, borderRadius: '3px', fontSize: '11px', color: colors.textSecondary, fontWeight: 500, letterSpacing: '0.01em' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {epic.attachments && epic.attachments.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '11px', color: colors.textTertiary }}>
                  <Paperclip size={11} />
                  <span>{epic.attachments.length} attachment{epic.attachments.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: colors.inactive, marginLeft: '12px', flexShrink: 0, display: 'flex' }}>
            <ChevronDown size={15} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <CommitGraph history={epicStats.commitHistory} color={epic.color} />
          <div style={{ display: 'flex', gap: '28px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: colors.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                {totalDays}
              </div>
              <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '3px', letterSpacing: '0.02em' }}>days invested</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: epicStats.recentDensity > 40 ? epic.color : epicStats.recentDensity > 15 ? colors.textSecondary : colors.inactive }}>
                {epicStats.recentDensity}%
              </div>
              <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '3px', letterSpacing: '0.02em' }}>last 2 weeks</div>
            </div>
            {epic.target && (
              <ProgressRing current={epic.target.current} total={epic.target.total} unit={epic.target.unit} color={epic.color} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded directives */}
      {isExpanded && (
        <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="section-label" style={{ marginBottom: '6px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
            Directives
          </div>
          {epic.directives.map((directive, index) => (
            <DirectiveRow
              key={directive.id}
              directive={directive}
              stats={directiveStats[index]}
              epicColor={epic.color}
              onLog={() => onCheckIn(directive.id)}
              onEdit={onEditDirective ? () => onEditDirective(directive) : undefined}
              onDelete={onDeleteDirective ? () => onDeleteDirective(directive.id) : undefined}
            />
          ))}
          {onAddDirective && (
            <button
              onClick={onAddDirective}
              style={{ padding: '12px', backgroundColor: 'transparent', border: `1px dashed ${colors.dashed}`, borderRadius: '8px', color: colors.textTertiary, fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginTop: '2px' }}
            >
              + Add directive
            </button>
          )}
        </div>
      )}
    </div>
  );
}

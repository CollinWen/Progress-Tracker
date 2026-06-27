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
  epicIndex?: number;
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// v2: quiet arc with thin stroke and compass tick marks
interface ProgressArcProps {
  current: number;
  total: number;
  unit: string;
  color: string;
}

function ProgressArc({ current, total, unit, color }: ProgressArcProps) {
  const { colors } = useTheme();
  const size = 72;
  const thickness = 1.5;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const dash = C * pct;

  // Tick marks at 0, 0.25, 0.5, 0.75
  const ticks = [0, 0.25, 0.5, 0.75].map(t => {
    const a = t * 2 * Math.PI;
    const x1 = size / 2 + Math.cos(a) * (r - 2);
    const y1 = size / 2 + Math.sin(a) * (r - 2);
    const x2 = size / 2 + Math.cos(a) * (r + 1);
    const y2 = size / 2 + Math.sin(a) * (r + 1);
    return { x1, y1, x2, y2, t };
  });

  const label = total > 0 ? `${Math.round(pct * 100)}%` : '—';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.graphEmpty} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${dash} ${C}`} strokeLinecap="butt"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        {ticks.map(tick => (
          <line key={tick.t} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke={color} strokeWidth="0.6" opacity="0.4" />
        ))}
      </svg>
      <div style={{ position: 'relative', textAlign: 'center', lineHeight: 1 }}>
        <div className="font-serif" style={{ fontSize: '16px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
          {label}
        </div>
        <div style={{ fontSize: '8px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
          {unit}
        </div>
      </div>
    </div>
  );
}

export function EpicCard({
  epic, logs, isExpanded, onToggleExpanded, onCheckIn,
  onEdit, onDelete, onAddDirective, onEditDirective, onDeleteDirective,
  epicIndex,
}: EpicCardProps) {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const epicStats = computeEpicStats(epic, logs);
  const directiveStats = epic.directives.map((d) => computeDirectiveStats(d, logs, epic.checkinInterval));
  const totalDays = directiveStats.reduce((sum, s) => sum + s.daysActive, 0);
  const daysRemaining = daysUntil(epic.deadline);

  const epicCode = epicIndex != null
    ? `EPIC · ${String(epicIndex + 1).padStart(2, '0')}`
    : 'EPIC';

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
      borderRadius: 0,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`,
      borderLeft: `3px solid ${epic.color}`,
    }}>
      <div onClick={onToggleExpanded} style={{ padding: '24px 28px', cursor: 'pointer' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Epic code + phase badge row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: epic.color, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {epicCode}
              </span>
              <div style={{ width: '18px', height: '1px', backgroundColor: colors.border }} />
              <PhaseBadge phase={epicStats.phase} />
              <DropdownMenu items={menuItems} />
            </div>

            {/* Epic name */}
            <h2 className="font-serif" style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 600, color: colors.text, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
              {epic.name}
            </h2>

            {/* Description + deadline inline */}
            <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
              {epic.description}
              {daysRemaining !== null && (
                <span style={{ marginLeft: '10px', color: colors.textTertiary, borderLeft: `1px solid ${colors.border}`, paddingLeft: '10px' }}>
                  {daysRemaining <= 0 ? 'overdue' : `${daysRemaining} days remaining`}
                </span>
              )}
            </p>

            {/* Tags — hairline bordered, square */}
            {epic.tags && epic.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
                {epic.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: '2px 7px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 0,
                    fontSize: '10px',
                    color: colors.textSecondary,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {epic.target && (
              <ProgressArc current={epic.target.current} total={epic.target.total} unit={epic.target.unit} color={epic.color} />
            )}
            <div style={{ transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', color: colors.inactive, display: 'flex' }}>
              <ChevronDown size={15} />
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <CommitGraph history={epicStats.commitHistory} color={epic.color} />
          <div style={{
            display: 'flex',
            gap: '36px',
            paddingLeft: '24px',
            borderLeft: `1px solid ${colors.borderLight}`,
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: colors.text, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {totalDays}
              </div>
              <div style={{ marginTop: '4px', fontSize: '9px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Days invested
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: epicStats.recentDensity > 40 ? epic.color : epicStats.recentDensity > 15 ? colors.textSecondary : colors.inactive,
              }}>
                {epicStats.recentDensity}%
              </div>
              <div style={{ marginTop: '4px', fontSize: '9px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Last 14 days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded directives ── */}
      {isExpanded && (
        <div style={{ padding: '0 28px 22px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Directives header — strong black top border */}
          <div style={{ borderTop: `1px solid ${colors.text}`, paddingTop: '14px', marginBottom: '6px' }}>
            <span className="section-label">Directives</span>
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
              style={{
                padding: '11px 14px',
                backgroundColor: 'transparent',
                border: `1px dashed ${colors.dashed}`,
                borderRadius: 0,
                color: colors.textTertiary,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              + Add directive
            </button>
          )}
        </div>
      )}
    </div>
  );
}

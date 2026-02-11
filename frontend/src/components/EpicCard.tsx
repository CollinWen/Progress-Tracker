import type { Epic, Log, Directive } from '../lib/types';
import { computeDirectiveStats, computeEpicStats } from '../lib/computeDerivedData';
import { PhaseBadge } from './PhaseBadge';
import { CommitGraph } from './CommitGraph';
import { DirectiveRow } from './DirectiveRow';

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
  const date = new Date(isoDate);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function EpicCard({
  epic,
  logs,
  isExpanded,
  onToggleExpanded,
  onCheckIn,
  onEdit,
  onDelete,
  onAddDirective,
  onEditDirective,
  onDeleteDirective,
}: EpicCardProps) {
  // Compute epic stats (includes phase calculation)
  const epicStats = computeEpicStats(epic, logs);

  const directiveStats = epic.directives.map((d) =>
    computeDirectiveStats(d, logs, epic.checkinInterval)
  );

  const totalDays = directiveStats.reduce(
    (sum, stats) => sum + stats.daysActive,
    0
  );

  const daysRemaining = daysUntil(epic.deadline);

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '16px',
        border: '1px solid #eae6e1',
      }}
    >
      <div
        onClick={onToggleExpanded}
        style={{
          padding: '28px 32px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
            <span style={{ fontSize: '28px' }}>{epic.emoji}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '6px',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '22px',
                    fontWeight: 600,
                    color: '#2d2d2d',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {epic.name}
                </h2>
                <PhaseBadge phase={epicStats.phase} />
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid #eae6e1',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: '#7a756e',
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${epic.name}"? This cannot be undone.`)) {
                        onDelete();
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1px solid #fed7d7',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: '#c53030',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: '#7a756e',
                }}
              >
                {epic.description}
                {daysRemaining !== null && (
                  <span
                    style={{
                      marginLeft: '8px',
                      padding: '3px 10px',
                      backgroundColor:
                        daysRemaining < 60 ? '#fff5eb' : '#f5f3f0',
                      color: daysRemaining < 60 ? '#c49a5c' : '#9a958e',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {daysRemaining}d left
                  </span>
                )}
              </p>
            </div>
          </div>
          <div
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: '#c5c0b8',
              fontSize: '14px',
            }}
          >
            ▼
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <CommitGraph history={epicStats.commitHistory} />

          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 600,
                  color: '#2d2d2d',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {totalDays}
              </div>
              <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                days invested
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 600,
                  color:
                    epicStats.recentDensity > 40
                      ? '#4a7171'
                      : epicStats.recentDensity > 15
                      ? '#8a7f72'
                      : '#c5c0b8',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {epicStats.recentDensity}%
              </div>
              <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                last 2 weeks
              </div>
            </div>
            {epic.target && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ lineHeight: 1 }}>
                  <span
                    style={{
                      fontSize: '36px',
                      fontWeight: 600,
                      color: '#2d2d2d',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {epic.target.current}
                  </span>
                  <span
                    style={{
                      fontSize: '24px',
                      fontWeight: 500,
                      color: '#c5c0b8',
                    }}
                  >
                    /{epic.target.total}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                  {epic.target.unit}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: '0 32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#9a958e',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
              paddingTop: '20px',
              borderTop: '1px solid #f0ebe4',
            }}
          >
            Directives
          </div>
          {epic.directives.map((directive, index) => (
            <DirectiveRow
              key={directive.id}
              directive={directive}
              stats={directiveStats[index]}
              epicEmoji={epic.emoji}
              onLog={() => onCheckIn(directive.id)}
              onEdit={onEditDirective ? () => onEditDirective(directive) : undefined}
              onDelete={onDeleteDirective ? () => onDeleteDirective(directive.id) : undefined}
            />
          ))}
          {onAddDirective && (
            <button
              onClick={onAddDirective}
              style={{
                padding: '14px',
                backgroundColor: 'transparent',
                border: '2px dashed #e0dbd4',
                borderRadius: '12px',
                color: '#9a958e',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: '4px',
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

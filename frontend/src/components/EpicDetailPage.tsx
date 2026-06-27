import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Link2 } from 'lucide-react';
import type { Epic, Log, Directive } from '../lib/types';
import { computeDirectiveStats, computeEpicStats } from '../lib/computeDerivedData';
import { PhaseBadge } from './PhaseBadge';
import { CommitGraph } from './CommitGraph';
import { DirectiveRow } from './DirectiveRow';
import { useTheme } from '../contexts/ThemeContext';

interface EpicDetailPageProps {
  epics: Epic[];
  logs: Log[];
  onCheckIn: (epicId: string, directiveId: string) => void;
  onEditEpic: (epic: Epic) => void;
  onDeleteEpic: (epicId: string) => void;
  onAddDirective: (epic: Epic) => void;
  onEditDirective: (epic: Epic, directive: Directive) => void;
  onDeleteDirective: (epicId: string, directiveId: string) => void;
  onLoadLogs: (options?: { epicId?: string; days?: number }) => Promise<void>;
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function TickSectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ width: '14px', height: '1px', backgroundColor: colors.text, flexShrink: 0 }} />
      <span className="section-label" style={{ margin: 0, flexShrink: 0 }}>{children}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
    </div>
  );
}

export function EpicDetailPage({
  epics,
  logs,
  onCheckIn,
  onEditEpic,
  onDeleteEpic,
  onAddDirective,
  onEditDirective,
  onDeleteDirective,
  onLoadLogs,
}: EpicDetailPageProps) {
  const { epicId } = useParams<{ epicId: string }>();
  const navigate = useNavigate();
  const { colors } = useTheme();

  useEffect(() => {
    if (epicId) onLoadLogs({ epicId });
  }, [epicId]);

  const epic = epics.find((e) => e.id === epicId);

  if (!epic) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background, padding: '40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', color: colors.text, marginBottom: '16px' }}>Epic not found</h1>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 20px', backgroundColor: colors.text, color: colors.surface, border: `1px solid ${colors.text}`, borderRadius: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const epicStats = computeEpicStats(epic, logs);
  const directiveStats = epic.directives.map((d) => computeDirectiveStats(d, logs, epic.checkinInterval));
  const totalDays = directiveStats.reduce((sum, s) => sum + s.daysActive, 0);
  const daysRemaining = daysUntil(epic.deadline);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>

      {/* ── Top bar ── */}
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 0,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onEditEpic(epic)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 0,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => { if (confirm(`Delete "${epic.name}"? This cannot be undone.`)) { onDeleteEpic(epic.id); navigate('/'); } }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: colors.danger,
                border: `1px solid ${colors.dangerBorder}`,
                borderRadius: 0,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 40px 64px' }}>

        {/* ── Epic header ── */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderLeft: `3px solid ${epic.color}`,
          padding: '28px 32px',
          marginBottom: '32px',
        }}>
          {/* Epic code row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: epic.color, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Epic detail
            </span>
            <div style={{ width: '18px', height: '1px', backgroundColor: colors.border }} />
            <PhaseBadge phase={epicStats.phase} />
            {daysRemaining !== null && (
              <span style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: daysRemaining <= 0 ? colors.danger : daysRemaining < 60 ? colors.warning : colors.textTertiary,
                borderLeft: `1px solid ${colors.border}`,
                paddingLeft: '10px',
              }}>
                {daysRemaining <= 0 ? 'Overdue' : `${daysRemaining}d remaining`}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="font-serif" style={{
            margin: '0 0 8px',
            fontSize: '36px',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            color: colors.text,
          }}>
            {epic.name}
          </h1>

          {/* Description */}
          {epic.description && (
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              {epic.description}
            </p>
          )}

          {/* Tags */}
          {epic.tags && epic.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '16px' }}>
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

          {/* Stats row */}
          <div style={{
            borderTop: `1px solid ${colors.borderLight}`,
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}>
            <CommitGraph history={epicStats.commitHistory} color={epic.color} />
            <div style={{ display: 'flex', gap: '36px', paddingLeft: '24px', borderLeft: `1px solid ${colors.borderLight}` }}>
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
              {epic.target && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ lineHeight: 1 }}>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: colors.text, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                      {epic.target.current}
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 500, color: colors.inactive }}>
                      /{epic.target.total}
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '9px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                    {epic.target.unit}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Attachments ── */}
        {epic.attachments && epic.attachments.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <TickSectionLabel>Attachments</TickSectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {epic.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block', padding: '16px', backgroundColor: colors.surface, borderRadius: 0, border: `1px solid ${colors.border}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = epic.color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  {attachment.type === 'photo' ? (
                    <div style={{ marginBottom: '12px', height: '140px', backgroundColor: colors.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) parent.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:${colors.textTertiary}"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textTertiary }}>
                      <Link2 size={28} />
                    </div>
                  )}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '4px' }}>{attachment.name}</div>
                  <div style={{ fontSize: '11px', color: colors.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(() => { try { return new URL(attachment.url).hostname; } catch { return attachment.url; } })()}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Notes ── */}
        {epic.notes && (
          <section style={{ marginBottom: '32px' }}>
            <TickSectionLabel>Notes</TickSectionLabel>
            <div style={{ padding: '20px 24px', backgroundColor: colors.surface, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: '14px', color: colors.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {epic.notes}
            </div>
          </section>
        )}

        {/* ── Directives ── */}
        <section>
          <TickSectionLabel>Directives</TickSectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {epic.directives.map((directive, index) => (
              <DirectiveRow
                key={directive.id}
                directive={directive}
                stats={directiveStats[index]}
                epicColor={epic.color}
                onLog={() => onCheckIn(epic.id, directive.id)}
                onEdit={() => onEditDirective(epic, directive)}
                onDelete={() => onDeleteDirective(epic.id, directive.id)}
              />
            ))}
            <button
              onClick={() => onAddDirective(epic)}
              style={{
                padding: '12px 14px',
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
          </div>
        </section>
      </div>
    </div>
  );
}

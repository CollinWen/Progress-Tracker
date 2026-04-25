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

  // Load only this epic's logs when the page mounts.
  useEffect(() => {
    if (epicId) onLoadLogs({ epicId });
  }, [epicId]);

  const epic = epics.find((e) => e.id === epicId);

  if (!epic) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background, padding: '40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', color: colors.text, marginBottom: '16px' }}>Epic not found</h1>
          <button onClick={() => navigate('/')} style={{ padding: '11px 22px', backgroundColor: colors.text, color: colors.surface, border: 'none', borderRadius: '5px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
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
      {/* Top bar */}
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 18px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '5px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onEditEpic(epic)}
              style={{ padding: '10px 18px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '5px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Edit Epic
            </button>
            <button
              onClick={() => { if (confirm(`Delete "${epic.name}"? This cannot be undone.`)) { onDeleteEpic(epic.id); navigate('/'); } }}
              style={{ padding: '10px 18px', backgroundColor: 'transparent', color: colors.danger, border: `1px solid ${colors.dangerBorder}`, borderRadius: '5px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Delete Epic
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 40px 64px' }}>
        {/* Epic header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '5px', backgroundColor: epic.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 className="font-serif" style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
                  {epic.name}
                </h1>
                <PhaseBadge phase={epicStats.phase} />
                {daysRemaining !== null && (
                  <span style={{ padding: '3px 8px', backgroundColor: daysRemaining < 60 ? colors.warningBg : colors.hover, color: daysRemaining < 60 ? colors.warning : colors.textTertiary, borderRadius: '3px', fontSize: '11px', fontWeight: 700 }}>
                    {daysRemaining <= 0 ? 'overdue' : `${daysRemaining}d left`}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '16px', color: colors.textSecondary, lineHeight: 1.5 }}>{epic.description}</p>
              {epic.tags && epic.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {epic.tags.map((tag) => (
                    <span key={tag} style={{ padding: '4px 10px', backgroundColor: colors.tagBg, borderRadius: '3px', fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px' }}>
            <CommitGraph history={epicStats.commitHistory} color={epic.color} />
            <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '36px', fontWeight: 600, color: colors.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{totalDays}</div>
                <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: '4px' }}>days invested</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '36px', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, color: epicStats.recentDensity > 40 ? epic.color : epicStats.recentDensity > 15 ? colors.textSecondary : colors.inactive }}>
                  {epicStats.recentDensity}%
                </div>
                <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: '4px' }}>last 2 weeks</div>
              </div>
              {epic.target && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ lineHeight: 1 }}>
                    <span style={{ fontSize: '36px', fontWeight: 600, color: colors.text, letterSpacing: '-0.03em' }}>{epic.target.current}</span>
                    <span style={{ fontSize: '24px', fontWeight: 500, color: colors.inactive }}>/{epic.target.total}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: colors.textTertiary, marginTop: '4px' }}>{epic.target.unit}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {epic.attachments && epic.attachments.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 className="section-label" style={{ marginBottom: '16px' }}>Attachments</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {epic.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'block', padding: '16px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}`, transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = epic.color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  {attachment.type === 'photo' ? (
                    <div style={{ marginBottom: '12px', height: '140px', borderRadius: '8px', backgroundColor: colors.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
                  <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '4px' }}>{attachment.name}</div>
                  <div style={{ fontSize: '12px', color: colors.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(() => { try { return new URL(attachment.url).hostname; } catch { return attachment.url; } })()}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {epic.notes && (
          <section style={{ marginBottom: '32px' }}>
            <h2 className="section-label" style={{ marginBottom: '16px' }}>Notes</h2>
            <div style={{ padding: '20px', backgroundColor: colors.surface, borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '15px', color: colors.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {epic.notes}
            </div>
          </section>
        )}

        {/* Directives */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="section-label" style={{ margin: 0 }}>Directives</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              style={{ padding: '16px', backgroundColor: 'transparent', border: `2px dashed ${colors.dashed}`, borderRadius: '8px', color: colors.textTertiary, fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              + Add directive
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

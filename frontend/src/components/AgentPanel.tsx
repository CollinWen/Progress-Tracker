import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Clock, Check, X, AlertTriangle, ExternalLink, GitBranch, ChevronRight } from 'lucide-react';
import type { Epic, Run, EpicSchedule } from '../lib/types';
import { getDataService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: 'Daily 9am', cron: '0 9 * * *' },
  { label: 'Weekdays 9am', cron: '0 9 * * 1-5' },
  { label: 'Weekly (Mon 9am)', cron: '0 9 * * 1' },
  { label: 'Hourly', cron: '0 * * * *' },
];

function TickSectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ width: '14px', height: '1px', backgroundColor: colors.text, flexShrink: 0 }} />
      <span className="section-label" style={{ margin: 0, flexShrink: 0 }}>{children}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
      {action}
    </div>
  );
}

/**
 * Agent surface for a single epic: schedule editor + run history.
 */
export function AgentPanel({ epic }: { epic: Epic }) {
  const { colors } = useTheme();

  // ── Schedule state (persisted directly via the data service) ──
  const initial = epic.schedule;
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [cron, setCron] = useState(initial?.cron ?? '0 9 * * *');
  const [timezone, setTimezone] = useState(initial?.timezone ?? BROWSER_TZ);
  const [nextRunAt] = useState(initial?.nextRunAt ?? null);
  const [lastRunAt] = useState(initial?.lastRunAt ?? null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // ── Run history ──
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  useEffect(() => {
    getDataService()
      .listRuns({ epicId: epic.id, limit: 20 })
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setRunsLoading(false));
  }, [epic.id]);

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const schedule: EpicSchedule = { enabled, cron, timezone, lastRunAt, nextRunAt };
      await getDataService().updateEpic(epic.id, { schedule });
      setSavedAt(Date.now());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const directiveName = (id: string) =>
    epic.directives.find((d) => d.id === id)?.name ?? id.slice(0, 8);

  return (
    <>
      {/* ── Schedule ── */}
      <section style={{ marginBottom: '32px' }}>
        <TickSectionLabel
          action={
            <Link
              to="/skills"
              style={{ fontSize: '11px', color: colors.textTertiary, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Skills <ChevronRight size={11} />
            </Link>
          }
        >
          Agent schedule
        </TickSectionLabel>

        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, padding: '20px 24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: enabled ? '18px' : 0 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={15} /> Run this epic's queued directives on a schedule
            </span>
          </label>

          {enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CRON_PRESETS.map((p) => (
                  <button
                    key={p.cron}
                    onClick={() => setCron(p.cron)}
                    style={{
                      padding: '5px 10px', borderRadius: 0, cursor: 'pointer',
                      border: `1px solid ${cron === p.cron ? colors.accent : colors.border}`,
                      backgroundColor: cron === p.cron ? colors.accentLight : 'transparent',
                      color: cron === p.cron ? colors.accent : colors.textSecondary,
                      fontSize: '11px', fontWeight: 600,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Field label="Cron expression">
                  <input
                    value={cron}
                    onChange={(e) => setCron(e.target.value)}
                    spellCheck={false}
                    style={inputStyle(colors)}
                  />
                </Field>
                <Field label="Timezone">
                  <input value={timezone} onChange={(e) => setTimezone(e.target.value)} style={inputStyle(colors)} />
                </Field>
              </div>

              <div style={{ fontSize: '11.5px', color: colors.textTertiary, display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                <span><Clock size={11} style={{ verticalAlign: '-1px' }} /> Last run: {fmt(lastRunAt)}</span>
                <span>Next run: {fmt(nextRunAt)}</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={saveSchedule}
              disabled={saving}
              style={{
                padding: '9px 18px', backgroundColor: colors.text, color: colors.surface,
                border: `1px solid ${colors.text}`, borderRadius: 0, fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
            {savedAt && <span style={{ fontSize: '12px', color: colors.accent }}><Check size={12} style={{ verticalAlign: '-2px' }} /> Saved</span>}
          </div>
        </div>
      </section>

      {/* ── Run history ── */}
      <section style={{ marginBottom: '32px' }}>
        <TickSectionLabel>Agent runs</TickSectionLabel>
        {runsLoading ? (
          <div style={{ fontSize: '14px', color: colors.textTertiary }}>Loading runs…</div>
        ) : runs.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px', textAlign: 'center' }}>
            <Bot size={32} color={colors.inactive} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '13px', color: colors.textTertiary }}>
              No agent runs yet. Queue a directive with an agent skill, then run the orchestrator.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {runs.map((run) => (
              <RunCard key={run.id} run={run} directiveName={directiveName} colors={colors} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function RunCard({ run, directiveName, colors }: { run: Run; directiveName: (id: string) => string; colors: any }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RunStatusBadge status={run.status} colors={colors} />
          <span style={{ fontSize: '11px', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {run.trigger}
          </span>
        </div>
        <span style={{ fontSize: '11.5px', color: colors.textTertiary }}>{fmt(run.startedAt)}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {run.items.map((item, i) => (
          <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.borderLight}`, paddingTop: i === 0 ? 0 : '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
              <ItemStatusDot status={item.status} colors={colors} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{directiveName(item.directiveId)}</span>
              <span style={{ fontSize: '10px', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.skill}</span>
            </div>
            {item.summary && (
              <div style={{ fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5, marginLeft: '16px' }}>
                {item.summary}
              </div>
            )}
            {item.artifacts.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', marginLeft: '16px' }}>
                {item.artifacts.map((a, j) => <Artifact key={j} artifact={a} colors={colors} />)}
              </div>
            )}
          </div>
        ))}
      </div>

      {run.createdDirectiveIds.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '11.5px', color: colors.accent, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <GitBranch size={12} /> Surfaced {run.createdDirectiveIds.length} new directive(s)
        </div>
      )}
      {run.error && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: colors.danger }}>{run.error}</div>
      )}
    </div>
  );
}

function Artifact({ artifact, colors }: { artifact: { type: string; ref: string; label?: string | null }; colors: any }) {
  const label = artifact.label || artifact.ref;
  if (artifact.type === 'url') {
    return (
      <a href={artifact.ref} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', border: `1px solid ${colors.border}`, fontSize: '11px', color: colors.textSecondary, textDecoration: 'none', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <ExternalLink size={10} />{label}
      </a>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', border: `1px solid ${colors.border}`, fontSize: '11px', color: colors.textTertiary }}>
      {artifact.type === 'commit' ? <GitBranch size={10} /> : null}{artifact.type}: {label}
    </span>
  );
}

function RunStatusBadge({ status, colors }: { status: string; colors: any }) {
  const map: Record<string, { c: string; icon: React.ReactNode }> = {
    completed: { c: colors.accent, icon: <Check size={11} /> },
    running: { c: colors.textSecondary, icon: <Clock size={11} /> },
    failed: { c: colors.danger, icon: <X size={11} /> },
  };
  const s = map[status] ?? map.running;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.c }}>
      {s.icon}{status}
    </span>
  );
}

function ItemStatusDot({ status, colors }: { status: string; colors: any }) {
  const color = status === 'done' ? colors.accent
    : status === 'failed' ? colors.danger
    : status === 'needs_review' ? colors.warning : colors.textTertiary;
  if (status === 'needs_review') return <AlertTriangle size={12} color={color} style={{ flexShrink: 0 }} />;
  return <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary }}>{label}</span>
      {children}
    </div>
  );
}

function inputStyle(colors: any): React.CSSProperties {
  return {
    padding: '8px 10px', border: `1px solid ${colors.border}`, borderRadius: 0,
    backgroundColor: colors.background, color: colors.text, fontSize: '13px', fontFamily: 'monospace',
  };
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

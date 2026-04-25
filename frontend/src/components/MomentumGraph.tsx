import { useState } from 'react';
import type { MomentumData, ActivityType } from '../lib/types';
import { getDailyMomentum, computeActivityBreakdown } from '../lib/computeDerivedData';
import { useTheme } from '../contexts/ThemeContext';

interface MomentumGraphProps {
  data: MomentumData;
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  build:    '#5b8a6e',
  learn:    '#7171a8',
  train:    '#a87171',
  research: '#7a9bb5',
  plan:     '#a8a371',
  arrange:  '#9a958e',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  build:    'Build',
  learn:    'Learn',
  train:    'Train',
  research: 'Research',
  plan:     'Plan',
  arrange:  'Arrange',
};

function formatDateLabel(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeRollingAvg(values: number[], window = 7): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);
    const slice = values.slice(start, end + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export function MomentumGraph({ data }: MomentumGraphProps) {
  const { colors, theme } = useTheme();
  const [hovered, setHovered] = useState<number | null>(null);

  const entries = getDailyMomentum(data, 30);
  const N = entries.length;

  const realHours = entries.map(e => e.totalHours);
  const effectiveHours = entries.map(e =>
    e.totalHours > 0 ? e.totalHours : e.totalActive > 0 ? 0.15 : 0
  );
  const maxEffective = Math.max(...effectiveHours, 0.01);
  const maxReal = Math.max(...realHours, 0.01);

  const rollingAvg = computeRollingAvg(realHours);
  const rollingNorm = rollingAvg.map(v => v / maxEffective);

  const breakdown = computeActivityBreakdown(data);
  const totalMins = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const activeTypes = (Object.keys(breakdown) as ActivityType[]).filter(t => breakdown[t] > 0);

  const tooltipBg = colors.text;
  const tooltipText = colors.surface;

  return (
    <div style={{ backgroundColor: colors.surface, borderRadius: '10px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-label" style={{ marginBottom: '4px' }}>Your Momentum</div>
          <div style={{ fontSize: '13px', color: colors.textSecondary }}>Last 30 days across all epics</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', maxWidth: '240px' }}>
          {data.epics.slice(0, 5).map(epic => (
            <div key={epic.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: epic.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: colors.textTertiary, whiteSpace: 'nowrap' }}>{epic.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div style={{ padding: '20px 28px 0', position: 'relative' }}>
        {/* Tooltip */}
        {hovered !== null && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% - 16px)',
            left: `${((hovered + 0.5) / N) * 100}%`,
            transform: 'translateX(-50%)',
            backgroundColor: tooltipBg,
            color: tooltipText,
            borderRadius: '5px',
            padding: '10px 14px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '5px', opacity: 0.85 }}>
              {formatDateLabel(entries[hovered].date)}
            </div>
            {entries[hovered].totalActive === 0 ? (
              <div style={{ opacity: 0.6 }}>No activity</div>
            ) : (
              <>
                {data.epics.filter(e => entries[hovered]!.epicActivity[e.id]).map(epic => (
                  <div key={epic.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: epic.color, flexShrink: 0 }} />
                    <span style={{ opacity: 0.75 }}>{epic.name}</span>
                    {entries[hovered]!.epicHours[epic.id] > 0 && (
                      <span style={{ opacity: 0.55, marginLeft: 'auto', paddingLeft: '8px' }}>
                        {entries[hovered]!.epicHours[epic.id].toFixed(1)}h
                      </span>
                    )}
                  </div>
                ))}
                {entries[hovered].totalHours > 0 && (
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${theme === 'light' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}`, fontWeight: 600 }}>
                    {entries[hovered].totalHours.toFixed(1)}h total
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Bars */}
        <div style={{ position: 'relative', height: '90px' }} onMouseLeave={() => setHovered(null)}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
            {entries.map((entry, i) => {
              const heightPct = (effectiveHours[i] / maxEffective) * 100;
              const isStub = entry.totalHours === 0 && entry.totalActive > 0;
              const activeEpics = data.epics.filter(e => entry.epicActivity[e.id]);
              const isHov = hovered === i;

              return (
                <div
                  key={entry.date}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', cursor: 'default', position: 'relative' }}
                  onMouseEnter={() => setHovered(i)}
                >
                  {entry.totalActive === 0 ? (
                    <div style={{ width: '100%', height: '3px', borderRadius: '2px', backgroundColor: colors.graphEmpty }} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: `${Math.max(heightPct, 4)}%`,
                      borderRadius: isStub ? '2px' : '3px 3px 0 0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      opacity: isHov ? 1 : 0.85,
                      transition: 'opacity 0.12s ease',
                    }}>
                      {isStub
                        ? activeEpics.map(epic => <div key={epic.id} style={{ flex: 1, backgroundColor: epic.color }} />)
                        : activeEpics.map(epic => (
                          <div key={epic.id} style={{ width: '100%', flex: entry.epicHours[epic.id] || 0, backgroundColor: epic.color, minHeight: entry.epicHours[epic.id] > 0 ? '2px' : 0 }} />
                        ))
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rolling average line */}
          {maxReal > 0 && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }} viewBox={`0 0 ${N} 1`} preserveAspectRatio="none">
              <polyline
                points={rollingNorm.map((v, i) => `${i + 0.5},${1 - v}`).join(' ')}
                fill="none"
                stroke={theme === 'light' ? 'rgba(45,45,45,0.2)' : 'rgba(255,255,255,0.15)'}
                strokeWidth="0.06"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {hovered !== null && rollingNorm[hovered] > 0 && (
                <circle cx={hovered + 0.5} cy={1 - rollingNorm[hovered]} r="0.3" fill={colors.text} fillOpacity="0.25" vectorEffect="non-scaling-stroke" />
              )}
            </svg>
          )}
        </div>

        {/* Date axis */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px', paddingBottom: '20px' }}>
          <span style={{ fontSize: '10px', color: colors.inactive }}>{formatDateLabel(entries[0].date)}</span>
          <span style={{ fontSize: '10px', color: colors.inactive }}>{formatDateLabel(entries[14].date)}</span>
          <span style={{ fontSize: '10px', color: colors.inactive }}>Today</span>
        </div>
      </div>

      {/* ── Activity breakdown ── */}
      {totalMins > 0 && activeTypes.length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.borderLight}`, padding: '16px 28px 20px' }}>
          <div className="section-label" style={{ marginBottom: '12px' }}>Activity mix</div>

          <div style={{ display: 'flex', height: '6px', borderRadius: '4px', overflow: 'hidden', gap: '2px', marginBottom: '12px' }}>
            {activeTypes.map(type => (
              <div key={type} style={{ flex: breakdown[type], backgroundColor: ACTIVITY_COLORS[type], borderRadius: '3px', minWidth: '4px' }} />
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
            {activeTypes.map(type => {
              const pct = Math.round((breakdown[type] / totalMins) * 100);
              const hours = (breakdown[type] / 60).toFixed(1);
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: ACTIVITY_COLORS[type], flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>{ACTIVITY_LABELS[type]}</span>
                  <span style={{ fontSize: '12px', color: colors.textTertiary }}>{pct}%</span>
                  <span style={{ fontSize: '11px', color: colors.inactive }}>· {hours}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { MomentumData } from '../lib/types';
import { getDailyMomentum, computeActivityBreakdown } from '../lib/computeDerivedData';
import { useTheme } from '../contexts/ThemeContext';

interface MomentumGraphProps {
  data: MomentumData;
}

const ACTIVITY_COLORS: Record<string, string> = {
  build:    '#5b8a6e',
  learn:    '#7171a8',
  train:    '#a87171',
  research: '#7a9bb5',
  plan:     '#a8a371',
  arrange:  '#9a958e',
};

const ACTIVITY_LABELS: Record<string, string> = {
  build:    'Build',
  learn:    'Learn',
  train:    'Train',
  research: 'Research',
  plan:     'Plan',
  arrange:  'Arrange',
};

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

  const totalHours = realHours.reduce((a, b) => a + b, 0);
  const activeDays = entries.filter(e => e.totalActive > 0).length;

  // Peak day index
  const peakIndex = effectiveHours.reduce((pi, h, i) => h > effectiveHours[pi] ? i : pi, 0);

  const rollingAvg = computeRollingAvg(realHours);
  const rollingNorm = rollingAvg.map(v => v / maxEffective);

  const breakdown = computeActivityBreakdown(data);
  const totalMins = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const activeTypes = (Object.keys(breakdown) as string[]).filter(t => breakdown[t as keyof typeof breakdown] > 0);

  // Y-axis ticks: 0, 0.25, 0.5, 0.75, 1.0 of maxEffective
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  // X-axis tick indices
  const xTicks = [0, 7, 14, 21, N - 1];

  const tooltipBg = colors.text;
  const tooltipText = colors.surface;

  return (
    <div style={{
      backgroundColor: colors.surface,
      borderRadius: 0,
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
    }}>

      {/* ── Editorial Header ── */}
      <div style={{ padding: '24px 32px 18px', borderBottom: `1px solid ${colors.borderLight}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            {/* VOL / ISSUE editorial label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: colors.textTertiary, textTransform: 'uppercase' }}>
                30-day reading
              </span>
              <div style={{ width: '16px', height: '1px', backgroundColor: colors.border }} />
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: colors.textTertiary, textTransform: 'uppercase' }}>
                all epics
              </span>
            </div>
            {/* Serif title */}
            <h2 className="font-serif" style={{
              margin: 0,
              fontSize: '38px',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: colors.text,
              lineHeight: 1,
            }}>
              Your momentum
            </h2>
          </div>

          {/* Total hours + active days */}
          <div style={{ textAlign: 'right' }}>
            {totalHours > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '48px', fontWeight: 700, letterSpacing: '-0.05em', color: colors.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {totalHours.toFixed(1)}
                  </span>
                  <span style={{ fontSize: '14px', color: colors.textTertiary, fontWeight: 500 }}>hrs</span>
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '2px' }}>
                  {activeDays} of {N} days active
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: colors.textTertiary }}>No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bar chart with Y-axis ── */}
      <div style={{ padding: '20px 32px 0', position: 'relative' }}>
        {/* Tooltip */}
        {hovered !== null && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% - 16px)',
            left: `${((hovered + 0.5) / N) * 100}%`,
            transform: 'translateX(-50%)',
            backgroundColor: tooltipBg,
            color: tooltipText,
            borderRadius: 0,
            padding: '10px 14px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '5px', opacity: 0.85, fontSize: '11px', letterSpacing: '0.06em' }}>
              {new Date(entries[hovered].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {entries[hovered].totalActive === 0 ? (
              <div style={{ opacity: 0.6 }}>No activity</div>
            ) : (
              <>
                {data.epics.filter(e => entries[hovered]!.epicActivity[e.id]).map(epic => (
                  <div key={epic.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                    <div style={{ width: '6px', height: '6px', backgroundColor: epic.color, flexShrink: 0 }} />
                    <span style={{ opacity: 0.75 }}>{epic.name}</span>
                    {entries[hovered]!.epicHours[epic.id] > 0 && (
                      <span style={{ opacity: 0.55, marginLeft: 'auto', paddingLeft: '8px' }}>
                        {entries[hovered]!.epicHours[epic.id].toFixed(1)}h
                      </span>
                    )}
                  </div>
                ))}
                {entries[hovered].totalHours > 0 && (
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${theme === 'light' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`, fontWeight: 600 }}>
                    {entries[hovered].totalHours.toFixed(1)}h total
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Chart area with Y-axis */}
        <div style={{ position: 'relative', height: '140px', marginLeft: '36px' }}>
          {/* Y-axis grid lines + labels */}
          {yTicks.map(t => (
            <div key={t} style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${(1 - t) * 100}%`,
              height: '1px',
              backgroundColor: t === 0 ? colors.text : colors.borderLight,
              display: 'flex',
              alignItems: 'center',
            }}>
              <span style={{
                position: 'absolute',
                left: '-36px',
                fontSize: '9px',
                color: colors.inactive,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.04em',
              }}>
                {(maxEffective * t).toFixed(1)}
              </span>
            </div>
          ))}

          {/* Bars */}
          <div
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '3px' }}
            onMouseLeave={() => setHovered(null)}
          >
            {entries.map((entry, i) => {
              const heightPct = (effectiveHours[i] / maxEffective) * 100;
              const isStub = entry.totalHours === 0 && entry.totalActive > 0;
              const activeEpics = data.epics.filter(e => entry.epicActivity[e.id]);
              const isPeak = i === peakIndex && entry.totalActive > 0;
              const isHov = hovered === i;

              return (
                <div
                  key={entry.date}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', cursor: 'default', position: 'relative' }}
                  onMouseEnter={() => setHovered(i)}
                >
                  {/* Peak callout */}
                  {isPeak && (
                    <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: colors.text, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Peak</div>
                      <div style={{ width: '1px', height: '6px', backgroundColor: colors.text, margin: '0 auto' }} />
                    </div>
                  )}

                  {entry.totalActive === 0 ? (
                    <div style={{ width: '100%', height: '2px', backgroundColor: colors.graphEmpty }} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: `${Math.max(heightPct, 4)}%`,
                      borderRadius: 0,
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
                stroke={theme === 'light' ? 'rgba(22,22,22,0.18)' : 'rgba(240,238,234,0.15)'}
                strokeWidth="0.06"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* X-axis — D-29, D-21, D-14, D-7, TODAY with tick marks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginLeft: '36px', paddingBottom: '16px' }}>
          {xTicks.map((idx, k) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '1px', height: '4px', backgroundColor: colors.text }} />
              <span style={{ fontSize: '9px', color: colors.textTertiary, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {idx === N - 1 ? 'Today' : `D-${N - 1 - idx}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend — strong top border, square dots ── */}
      <div style={{ borderTop: `1px solid ${colors.text}`, padding: '14px 32px 18px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {data.epics.slice(0, 5).map(epic => (
          <div key={epic.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: epic.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: colors.text, fontWeight: 500 }}>{epic.name}</span>
          </div>
        ))}
      </div>

      {/* ── Activity mix breakdown ── */}
      {totalMins > 0 && activeTypes.length > 0 && (
        <div style={{ borderTop: `1px solid ${colors.borderLight}`, padding: '14px 32px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '14px', height: '1px', backgroundColor: colors.text }} />
            <span className="section-label">Activity mix</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
          </div>

          <div style={{ display: 'flex', height: '4px', borderRadius: 0, overflow: 'hidden', gap: '1px', marginBottom: '12px' }}>
            {activeTypes.map(type => (
              <div key={type} style={{ flex: breakdown[type as keyof typeof breakdown], backgroundColor: ACTIVITY_COLORS[type], minWidth: '4px' }} />
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
            {activeTypes.map(type => {
              const pct = Math.round((breakdown[type as keyof typeof breakdown] / totalMins) * 100);
              const hours = (breakdown[type as keyof typeof breakdown] / 60).toFixed(1);
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', backgroundColor: ACTIVITY_COLORS[type], flexShrink: 0 }} />
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

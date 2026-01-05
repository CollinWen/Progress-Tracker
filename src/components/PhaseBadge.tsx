import type { Phase } from '../lib/types';

interface PhaseBadgeProps {
  phase: Phase;
}

const phaseConfig: Record<Phase, { bg: string; color: string }> = {
  exploring: { bg: '#f0ebe4', color: '#8a7f72' },
  building: { bg: '#e8efe8', color: '#5c6e5c' },
  active: { bg: '#e5f0f0', color: '#4a7171' },
  refining: { bg: '#f0e8f0', color: '#6e5c6e' },
  paused: { bg: '#f5f3f0', color: '#a09890' },
};

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const style = phaseConfig[phase];

  return (
    <span
      style={{
        padding: '6px 14px',
        backgroundColor: style.bg,
        color: style.color,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {phase}
    </span>
  );
}

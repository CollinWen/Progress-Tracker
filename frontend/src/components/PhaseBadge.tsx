import type { Phase } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface PhaseBadgeProps {
  phase: Phase;
}

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const { theme } = useTheme();

  // v2: saturated colors, square, assertive
  const lightConfig: Record<Phase, { bg: string; color: string }> = {
    exploring: { bg: '#e9dec7', color: '#6b5a3c' },
    building:  { bg: '#d6e2c8', color: '#3c5a3c' },
    active:    { bg: '#cce0e0', color: '#175a5a' },
    refining:  { bg: '#e0c8e0', color: '#5a3c5a' },
    paused:    { bg: '#ede9e2', color: '#8a8278' },
  };

  const darkConfig: Record<Phase, { bg: string; color: string }> = {
    exploring: { bg: '#2e2a26', color: '#a09486' },
    building:  { bg: '#1e2e1e', color: '#7aa87a' },
    active:    { bg: '#1a2e2e', color: '#6a9d9d' },
    refining:  { bg: '#2a1e2a', color: '#9a7a9a' },
    paused:    { bg: '#282624', color: '#8a8280' },
  };

  const config = theme === 'light' ? lightConfig[phase] : darkConfig[phase];

  return (
    <span style={{
      padding: '3px 8px',
      backgroundColor: config.bg,
      color: config.color,
      borderRadius: 0,
      fontSize: '9px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
    }}>
      {phase}
    </span>
  );
}

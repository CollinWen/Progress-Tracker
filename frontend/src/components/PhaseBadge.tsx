import type { Phase } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface PhaseBadgeProps {
  phase: Phase;
}

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const { theme } = useTheme();

  const lightConfig: Record<Phase, { bg: string; color: string }> = {
    exploring: { bg: '#f0ebe4', color: '#8a7f72' },
    building:  { bg: '#e8efe8', color: '#5c6e5c' },
    active:    { bg: '#e5f0f0', color: '#4a7171' },
    refining:  { bg: '#f0e8f0', color: '#6e5c6e' },
    paused:    { bg: '#f5f3f0', color: '#a09890' },
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
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {phase}
    </span>
  );
}

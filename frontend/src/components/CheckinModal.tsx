import { useState } from 'react';
import { Zap, Package, Target } from 'lucide-react';
import type { Epic, SessionType } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CheckinFormData) => void;
  epics: Epic[];
  preselectedEpicId?: string;
  preselectedDirectiveId?: string;
}

export interface CheckinFormData {
  epicId: string;
  directiveId: string;
  note: string;
  durationMinutes: number | null;
  sessionType?: SessionType;
}

const sessionTypes: Array<{ key: SessionType; label: string; description: string; icon: React.ReactNode }> = [
  { key: 'quick',   label: 'Quick',   description: '10–15 min', icon: <Zap size={16} /> },
  { key: 'blocked', label: 'Blocked', description: '30–60 min', icon: <Package size={16} /> },
  { key: 'deep',    label: 'Deep',    description: '1+ hours',  icon: <Target size={16} /> },
];

export function CheckinModal({ isOpen, onClose, onSubmit, epics, preselectedEpicId, preselectedDirectiveId }: CheckinModalProps) {
  const { colors, theme } = useTheme();
  const [selectedEpicId, setSelectedEpicId] = useState<string>(preselectedEpicId || '');
  const [selectedDirectiveId, setSelectedDirectiveId] = useState<string>(preselectedDirectiveId || '');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType | undefined>();

  const availableDirectives = epics.find((e) => e.id === selectedEpicId)?.directives || [];

  const handleSubmit = () => {
    if (!selectedEpicId || !selectedDirectiveId) { alert('Please select an epic and directive'); return; }
    onSubmit({ epicId: selectedEpicId, directiveId: selectedDirectiveId, note, durationMinutes: duration ? parseInt(duration, 10) : null, sessionType: selectedSessionType });
    setNote(''); setDuration(''); setSelectedSessionType(undefined);
    if (!preselectedEpicId) setSelectedEpicId('');
    if (!preselectedDirectiveId) setSelectedDirectiveId('');
  };

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: colors.hover,
    border: `1px solid ${colors.border}`,
    borderRadius: '5px',
    color: colors.text,
    fontSize: '14px',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: theme === 'light' ? 'rgba(22,22,22,0.35)' : 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: colors.surface, borderRadius: '10px', padding: '36px', width: '100%', maxWidth: '640px', boxShadow: theme === 'light' ? '0 8px 40px rgba(0,0,0,0.16)' : '0 8px 40px rgba(0,0,0,0.6)', border: `1px solid ${colors.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif" style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
          Quick check-in
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '14px', color: colors.textTertiary, letterSpacing: '0.01em' }}>
          Log your progress for today
        </p>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Epic</label>
          <select value={selectedEpicId} onChange={(e) => { setSelectedEpicId(e.target.value); setSelectedDirectiveId(''); }} disabled={!!preselectedEpicId} style={{ ...inputStyle, cursor: preselectedEpicId ? 'not-allowed' : 'pointer' }}>
            <option value="">Select an epic…</option>
            {epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Directive</label>
          <select value={selectedDirectiveId} onChange={(e) => setSelectedDirectiveId(e.target.value)} disabled={!selectedEpicId || !!preselectedDirectiveId} style={{ ...inputStyle, cursor: !selectedEpicId || preselectedDirectiveId ? 'not-allowed' : 'pointer' }}>
            <option value="">Select a directive…</option>
            {availableDirectives.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <textarea
          placeholder="What did you work on? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...inputStyle, height: '90px', resize: 'none', marginBottom: '14px' }}
        />

        {/* Session type */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Session type</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {sessionTypes.map((type) => {
              const isSel = selectedSessionType === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setSelectedSessionType(isSel ? undefined : type.key)}
                  style={{
                    padding: '12px 10px',
                    backgroundColor: isSel ? colors.text : colors.hover,
                    border: isSel ? `1px solid ${colors.text}` : `1px solid ${colors.border}`,
                    borderRadius: '5px',
                    color: isSel ? colors.surface : colors.textSecondary,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ display: 'flex' }}>{type.icon}</span>
                  <span style={{ fontWeight: 700, letterSpacing: '0.01em' }}>{type.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.75 }}>{type.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Duration (minutes, optional)</label>
          <input type="number" placeholder="e.g., 60" value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '13px', backgroundColor: colors.hover, border: `1px solid ${colors.border}`, borderRadius: '5px', color: colors.textSecondary, fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ flex: 1, padding: '13px', backgroundColor: colors.text, border: 'none', borderRadius: '5px', color: colors.surface, fontSize: '14px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}
          >
            Log it
          </button>
        </div>
      </div>
    </div>
  );
}

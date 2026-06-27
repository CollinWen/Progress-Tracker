import { useState } from 'react';
import { Hammer, BookOpen, Dumbbell, Search, ClipboardList, Package, CheckSquare2, RefreshCw, Link2 } from 'lucide-react';
import type { Directive, ActivityType, Attachment } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface DirectiveModalProps {
  directive?: Directive;
  onSave: (directive: Partial<Directive>) => Promise<void>;
  onClose: () => void;
}

const activityTypes: ActivityType[] = ['build', 'learn', 'train', 'research', 'plan', 'arrange'];

const activityConfig: Record<ActivityType, { label: string; description: string; icon: React.ReactNode }> = {
  build:    { label: 'Build',    description: 'Active creation, making something', icon: <Hammer size={16} /> },
  learn:    { label: 'Learn',    description: 'Absorbing new information',          icon: <BookOpen size={16} /> },
  train:    { label: 'Train',    description: 'Physical practice and conditioning', icon: <Dumbbell size={16} /> },
  research: { label: 'Research', description: 'Exploration and discovery',          icon: <Search size={16} /> },
  plan:     { label: 'Plan',     description: 'Strategy and decision-making',       icon: <ClipboardList size={16} /> },
  arrange:  { label: 'Arrange',  description: 'Logistics and setup',                icon: <Package size={16} /> },
};

export function DirectiveModal({ directive, onSave, onClose }: DirectiveModalProps) {
  const { colors, theme } = useTheme();
  const [name, setName] = useState(directive?.name || '');
  const [type, setType] = useState<ActivityType>(directive?.type || 'build');
  const [progressType, setProgressType] = useState<'ongoing' | 'task'>(directive?.progressType || 'ongoing');
  const [attachments, setAttachments] = useState<Attachment[]>(directive?.attachments || []);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddAttachment = () => {
    const trimmedUrl = attachmentUrl.trim();
    const trimmedName = attachmentName.trim();
    if (trimmedUrl && trimmedName) {
      setAttachments([...attachments, { id: `attachment_${Date.now()}`, type: 'link', url: trimmedUrl, name: trimmedName, createdAt: new Date().toISOString() }]);
      setAttachmentUrl('');
      setAttachmentName('');
    }
  };

  const handleRemoveAttachment = (id: string) => setAttachments(attachments.filter(a => a.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Directive name is required'); return; }
    setIsSaving(true);
    try {
      await onSave({ name: name.trim(), type, progressType, attachments: attachments.length > 0 ? attachments : undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save directive');
      setIsSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    border: `1px solid ${colors.border}`,
    borderRadius: 0,
    backgroundColor: colors.hover,
    color: colors.text,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: colors.textTertiary,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: theme === 'light' ? 'rgba(22,22,22,0.35)' : 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ backgroundColor: colors.surface, borderRadius: 0, maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '36px', boxShadow: 'var(--shadow-modal)', border: `1px solid ${colors.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif" style={{ margin: '0 0 24px', fontSize: '22px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
          {directive ? 'Edit Directive' : 'Create New Directive'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Directive Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Market research, Structured training" required style={inputStyle} />
          </div>

          {/* Activity Type */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Activity Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {activityTypes.map((t) => {
                const config = activityConfig[t];
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{
                      padding: '10px 12px',
                      border: isSelected ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                      borderRadius: 0,
                      backgroundColor: isSelected ? colors.accentLight : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                      <span style={{ color: isSelected ? colors.accent : colors.textTertiary, display: 'flex' }}>{config.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? colors.accent : colors.text, textTransform: 'capitalize' }}>{config.label}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: colors.textTertiary, lineHeight: '1.3' }}>
                      {config.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Progress Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setProgressType('task')}
                style={{
                  padding: '10px 14px',
                  border: progressType === 'task' ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  borderRadius: 0,
                  backgroundColor: progressType === 'task' ? colors.accentLight : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <CheckSquare2 size={14} color={progressType === 'task' ? colors.accent : colors.textTertiary} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: progressType === 'task' ? colors.accent : colors.text }}>To-do / Task</span>
                </div>
                <div style={{ fontSize: '11px', color: colors.textTertiary, lineHeight: '1.3' }}>Can be marked complete</div>
              </button>
              <button
                type="button"
                onClick={() => setProgressType('ongoing')}
                style={{
                  padding: '10px 14px',
                  border: progressType === 'ongoing' ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  borderRadius: 0,
                  backgroundColor: progressType === 'ongoing' ? colors.accentLight : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <RefreshCw size={14} color={progressType === 'ongoing' ? colors.accent : colors.textTertiary} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: progressType === 'ongoing' ? colors.accent : colors.text }}>Ongoing Activity</span>
                </div>
                <div style={{ fontSize: '11px', color: colors.textTertiary, lineHeight: '1.3' }}>Continuous practice</div>
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div style={{ marginBottom: '22px' }}>
            <label style={labelStyle}>Resource Links (optional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
              <input type="text" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Name (e.g., Tutorial)" style={{ ...inputStyle, flex: 1 }} />
              <input type="url" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="URL" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={handleAddAttachment} style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Add
              </button>
            </div>
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachments.map((att) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: colors.hover, borderRadius: 0, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <Link2 size={14} color={colors.textTertiary} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>{att.name}</div>
                        <div style={{ fontSize: '11px', color: colors.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.url}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveAttachment(att.id)} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 600, border: `1px solid ${colors.dangerBorder}`, borderRadius: 0, backgroundColor: 'transparent', color: colors.danger, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: 0, color: colors.danger, fontSize: '13px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={isSaving} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: 'transparent', color: colors.textSecondary, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 600, border: `1px solid ${isSaving ? colors.inactive : colors.text}`, borderRadius: 0, backgroundColor: isSaving ? colors.inactive : colors.text, color: colors.surface, cursor: isSaving ? 'not-allowed' : 'pointer', letterSpacing: '0.01em' }}>
              {isSaving ? 'Saving…' : directive ? 'Save Changes' : 'Create Directive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link2, Image } from 'lucide-react';
import type { Epic, CheckinInterval, Attachment } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';

interface EpicModalProps {
  epic?: Epic;
  onSave: (epic: Partial<Epic>) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#1e5252', '#2a6e4e', '#5c5280', '#7a4040',
  '#6e5c20', '#2a5c6e', '#5c2a6e', '#3d6e3d',
  '#6e3d2a', '#2a3d6e', '#6e2a3d', '#5c6e2a',
];

const CHECKIN_INTERVALS: Array<{ value: CheckinInterval; label: string; description: string }> = [
  { value: 'daily',    label: 'Daily',    description: 'Every day' },
  { value: 'weekly',   label: 'Weekly',   description: 'Once a week' },
  { value: 'biweekly', label: 'Biweekly', description: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly',  description: 'Once a month' },
];

export function EpicModal({ epic, onSave, onClose }: EpicModalProps) {
  const { colors, theme } = useTheme();
  const [name, setName] = useState(epic?.name || '');
  const [color, setColor] = useState(epic?.color || PRESET_COLORS[0]);
  const [description, setDescription] = useState(epic?.description || '');
  const [checkinInterval, setCheckinInterval] = useState<CheckinInterval>(epic?.checkinInterval || 'weekly');
  const [deadline, setDeadline] = useState(epic?.deadline || '');
  const [hasTarget, setHasTarget] = useState(!!epic?.target);
  const [targetCurrent, setTargetCurrent] = useState(epic?.target?.current?.toString() || '0');
  const [targetTotal, setTargetTotal] = useState(epic?.target?.total?.toString() || '');
  const [targetUnit, setTargetUnit] = useState(epic?.target?.unit || '');
  const [tags, setTags] = useState<string[]>(epic?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>(epic?.attachments || []);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<'link' | 'photo'>('link');
  const [notes, setNotes] = useState(epic?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  };
  const addAttachment = () => {
    const url = attachmentUrl.trim(), n = attachmentName.trim();
    if (url && n) {
      setAttachments([...attachments, { id: `attachment_${Date.now()}`, type: attachmentType, url, name: n, createdAt: new Date().toISOString() }]);
      setAttachmentUrl(''); setAttachmentName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Epic name is required'); return; }
    setIsSaving(true); setError(null);
    try {
      await onSave({
        uuid: epic?.uuid || `epic_${Date.now()}`, name: name.trim(), color,
        description: description.trim(), checkinInterval,
        deadline: deadline || null,
        target: hasTarget && targetTotal ? { current: parseInt(targetCurrent) || 0, total: parseInt(targetTotal), unit: targetUnit.trim() || 'items' } : null,
        tags: tags.length > 0 ? tags : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save epic');
      setIsSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: 0, fontFamily: 'inherit', backgroundColor: colors.hover, color: colors.text, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '10px', fontWeight: 700, color: colors.textTertiary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: theme === 'light' ? 'rgba(22,22,22,0.35)' : 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: colors.surface, borderRadius: 0, maxWidth: '860px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '36px', boxShadow: 'var(--shadow-modal)', border: `1px solid ${colors.border}` }}
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif" style={{ margin: '0 0 24px', fontSize: '22px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
          {epic ? 'Edit Epic' : 'Create New Epic'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Color + Name */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={labelStyle}>Color</label>
              <div style={{ width: '44px', height: '44px', borderRadius: 0, backgroundColor: color, marginBottom: '6px', border: `1px solid ${colors.border}` }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', width: '100px' }}>
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    style={{ width: '22px', height: '22px', borderRadius: 0, backgroundColor: c, border: color === c ? `2px solid ${colors.text}` : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Epic Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Launch lighting business" required style={inputStyle} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this epic about?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Check-in Interval */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Check-in Interval</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {CHECKIN_INTERVALS.map((interval) => (
                <button key={interval.value} type="button" onClick={() => setCheckinInterval(interval.value)}
                  style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'left', border: checkinInterval === interval.value ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: checkinInterval === interval.value ? colors.accentLight : 'transparent', color: checkinInterval === interval.value ? colors.accent : colors.textSecondary, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, marginBottom: '1px', fontSize: '12px' }}>{interval.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>{interval.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ padding: '10px 14px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text }} />
          </div>

          {/* Target */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={hasTarget} onChange={(e) => setHasTarget(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: colors.accent }} />
              <span style={{ ...labelStyle, margin: 0 }}>Set target (e.g., "2 races", "5 books")</span>
            </label>
            {hasTarget && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" value={targetCurrent} onChange={(e) => setTargetCurrent(e.target.value)} placeholder="Current" min="0" style={{ width: '85px', padding: '10px 14px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text }} />
                <span style={{ display: 'flex', alignItems: 'center', color: colors.textTertiary, fontWeight: 700 }}>/</span>
                <input type="number" value={targetTotal} onChange={(e) => setTargetTotal(e.target.value)} placeholder="Total" min="1" required={hasTarget} style={{ width: '85px', padding: '10px 14px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text }} />
                <input type="text" value={targetUnit} onChange={(e) => setTargetUnit(e.target.value)} placeholder="unit (e.g., races)" style={{ flex: 1, padding: '10px 14px', fontSize: '14px', border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text }} />
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Tags (optional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="e.g., work, health" style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addTag} style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((tag) => (
                  <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', backgroundColor: colors.tagBg, borderRadius: 0, fontSize: '12px', color: colors.textSecondary }}>
                    <span>{tag}</span>
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} style={{ background: 'none', border: 'none', color: colors.textTertiary, cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Attachments (optional)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input type="text" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Name (e.g., Design Doc)" style={{ ...inputStyle, marginBottom: '6px' }} />
                <input type="url" value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="URL" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <select value={attachmentType} onChange={(e) => setAttachmentType(e.target.value as 'link' | 'photo')} style={{ padding: '10px 14px', fontSize: '13px', border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.surface, color: colors.text }}>
                  <option value="link">Link</option>
                  <option value="photo">Photo</option>
                </select>
                <button type="button" onClick={addAttachment} style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: colors.hover, color: colors.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>
            </div>
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachments.map((att) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: colors.hover, borderRadius: 0, border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ color: colors.textTertiary, display: 'flex' }}>
                        {att.type === 'photo' ? <Image size={14} /> : <Link2 size={14} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: colors.text }}>{att.name}</div>
                        <div style={{ fontSize: '11px', color: colors.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.url}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 600, border: `1px solid ${colors.dangerBorder}`, borderRadius: 0, backgroundColor: 'transparent', color: colors.danger, cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '22px' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add detailed notes, journal entries, or thoughts…" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: 0, color: colors.danger, fontSize: '13px', marginBottom: '18px' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={isSaving} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 600, border: `1px solid ${colors.border}`, borderRadius: 0, backgroundColor: 'transparent', color: colors.textSecondary, cursor: isSaving ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button type="submit" disabled={isSaving} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: 600, border: `1px solid ${isSaving ? colors.inactive : colors.text}`, borderRadius: 0, backgroundColor: isSaving ? colors.inactive : colors.text, color: colors.surface, cursor: isSaving ? 'not-allowed' : 'pointer', letterSpacing: '0.01em' }}>
              {isSaving ? 'Saving…' : epic ? 'Save Changes' : 'Create Epic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

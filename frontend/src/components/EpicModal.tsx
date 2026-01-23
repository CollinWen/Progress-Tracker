import { useState } from 'react';
import type { Epic, Phase } from '../lib/types';

interface EpicModalProps {
  epic?: Epic; // If provided, we're editing. Otherwise, creating.
  onSave: (epic: Partial<Epic>) => Promise<void>;
  onClose: () => void;
}

export function EpicModal({ epic, onSave, onClose }: EpicModalProps) {
  const [name, setName] = useState(epic?.name || '');
  const [emoji, setEmoji] = useState(epic?.emoji || '🎯');
  const [description, setDescription] = useState(epic?.description || '');
  const [phase, setPhase] = useState<Phase>(epic?.phase || 'exploring');
  const [deadline, setDeadline] = useState(epic?.deadline || '');
  const [hasTarget, setHasTarget] = useState(!!epic?.target);
  const [targetCurrent, setTargetCurrent] = useState(epic?.target?.current?.toString() || '0');
  const [targetTotal, setTargetTotal] = useState(epic?.target?.total?.toString() || '');
  const [targetUnit, setTargetUnit] = useState(epic?.target?.unit || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phases: Phase[] = ['exploring', 'building', 'active', 'refining', 'paused'];

  const phaseColors = {
    exploring: '#c49a5c',
    building: '#4a7171',
    active: '#5c8a6e',
    refining: '#7a756e',
    paused: '#9a958e',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Epic name is required');
      return;
    }

    setIsSaving(true);

    try {
      const epicData: Partial<Epic> = {
        name: name.trim(),
        emoji,
        description: description.trim(),
        phase,
        deadline: deadline || null,
        target: hasTarget && targetTotal
          ? {
              current: parseInt(targetCurrent) || 0,
              total: parseInt(targetTotal),
              unit: targetUnit.trim() || 'items',
            }
          : null,
      };

      await onSave(epicData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save epic');
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '32px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 24px 0',
            fontSize: '24px',
            fontWeight: 600,
            color: '#2d2d2d',
          }}
        >
          {epic ? 'Edit Epic' : 'Create New Epic'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name and Emoji */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
                EMOJI
              </label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                style={{
                  width: '60px',
                  padding: '12px',
                  fontSize: '24px',
                  textAlign: 'center',
                  border: '1px solid #eae6e1',
                  borderRadius: '12px',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
                EPIC NAME *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Launch lighting business"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid #eae6e1',
                  borderRadius: '12px',
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this epic about?"
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '15px',
                border: '1px solid #eae6e1',
                borderRadius: '12px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Phase */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              PHASE
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {phases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhase(p)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: phase === p ? 'none' : '1px solid #eae6e1',
                    borderRadius: '10px',
                    backgroundColor: phase === p ? phaseColors[p] : 'transparent',
                    color: phase === p ? '#fff' : '#7a756e',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              DEADLINE (Optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                padding: '12px 16px',
                fontSize: '15px',
                border: '1px solid #eae6e1',
                borderRadius: '12px',
              }}
            />
          </div>

          {/* Target */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasTarget}
                onChange={(e) => setHasTarget(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#5a554e' }}>
                SET TARGET (e.g., "2 races", "5 books")
              </span>
            </label>

            {hasTarget && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <input
                  type="number"
                  value={targetCurrent}
                  onChange={(e) => setTargetCurrent(e.target.value)}
                  placeholder="Current"
                  min="0"
                  style={{
                    width: '100px',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1px solid #eae6e1',
                    borderRadius: '12px',
                  }}
                />
                <span style={{ display: 'flex', alignItems: 'center', color: '#7a756e' }}>/</span>
                <input
                  type="number"
                  value={targetTotal}
                  onChange={(e) => setTargetTotal(e.target.value)}
                  placeholder="Total"
                  min="1"
                  required={hasTarget}
                  style={{
                    width: '100px',
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1px solid #eae6e1',
                    borderRadius: '12px',
                  }}
                />
                <input
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="unit (e.g., races, books)"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    fontSize: '15px',
                    border: '1px solid #eae6e1',
                    borderRadius: '12px',
                  }}
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '8px',
              color: '#c53030',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                border: '1px solid #eae6e1',
                borderRadius: '12px',
                backgroundColor: 'transparent',
                color: '#5a554e',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '12px',
                backgroundColor: isSaving ? '#9a958e' : '#2d2d2d',
                color: '#fff',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : epic ? 'Save Changes' : 'Create Epic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

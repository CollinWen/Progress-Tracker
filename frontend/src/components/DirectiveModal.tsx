import { useState } from 'react';
import type { Directive, ActivityType, CheckinInterval } from '../lib/types';

interface DirectiveModalProps {
  directive?: Directive; // If provided, we're editing. Otherwise, creating.
  onSave: (directive: Partial<Directive>) => Promise<void>;
  onClose: () => void;
}

export function DirectiveModal({ directive, onSave, onClose }: DirectiveModalProps) {
  const [name, setName] = useState(directive?.name || '');
  const [type, setType] = useState<ActivityType>(directive?.type || 'build');
  const [interval, setInterval] = useState<CheckinInterval>(directive?.interval || 'weekly');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activityTypes: ActivityType[] = ['build', 'learn', 'train', 'research', 'plan', 'arrange'];
  const intervals: CheckinInterval[] = ['daily', 'weekly', 'biweekly', 'monthly'];

  const activityTypeDescriptions = {
    build: 'Active creation, making something',
    learn: 'Absorbing new information',
    train: 'Physical practice and conditioning',
    research: 'Exploration and discovery',
    plan: 'Strategy and decision-making',
    arrange: 'Logistics and setup',
  };

  const activityTypeEmojis = {
    build: '🔨',
    learn: '📚',
    train: '💪',
    research: '🔍',
    plan: '📋',
    arrange: '📦',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Directive name is required');
      return;
    }

    setIsSaving(true);

    try {
      const directiveData: Partial<Directive> = {
        name: name.trim(),
        type,
        interval,
      };

      await onSave(directiveData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save directive');
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
          maxWidth: '520px',
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
          {directive ? 'Edit Directive' : 'Create New Directive'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              DIRECTIVE NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Market research, Structured training"
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

          {/* Activity Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              ACTIVITY TYPE *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {activityTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding: '12px 16px',
                    border: type === t ? '2px solid #4a7171' : '1px solid #eae6e1',
                    borderRadius: '12px',
                    backgroundColor: type === t ? '#f7f5f2' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '18px' }}>{activityTypeEmojis[t]}</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d2d2d', textTransform: 'capitalize' }}>
                      {t}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7a756e', lineHeight: '1.3' }}>
                    {activityTypeDescriptions[t]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Check-in Interval */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#5a554e', marginBottom: '8px' }}>
              CHECK-IN INTERVAL *
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {intervals.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: interval === i ? 'none' : '1px solid #eae6e1',
                    borderRadius: '10px',
                    backgroundColor: interval === i ? '#4a7171' : 'transparent',
                    color: interval === i ? '#fff' : '#7a756e',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#7a756e', marginTop: '8px' }}>
              This determines when the directive is flagged as needing attention.
            </div>
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
              {isSaving ? 'Saving...' : directive ? 'Save Changes' : 'Create Directive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

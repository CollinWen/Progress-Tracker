import { useState } from 'react';
import type { Epic, ActivityType } from '../lib/types';

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
  activityType?: ActivityType;
}

const activityTypes: Array<{
  key: ActivityType;
  label: string;
  emoji: string;
}> = [
  { key: 'build', label: 'Build', emoji: '🛠' },
  { key: 'learn', label: 'Learn', emoji: '📚' },
  { key: 'train', label: 'Train', emoji: '💪' },
  { key: 'research', label: 'Research', emoji: '🔍' },
  { key: 'plan', label: 'Plan', emoji: '🎯' },
  { key: 'arrange', label: 'Arrange', emoji: '📋' },
];

export function CheckinModal({
  isOpen,
  onClose,
  onSubmit,
  epics,
  preselectedEpicId,
  preselectedDirectiveId,
}: CheckinModalProps) {
  const [selectedEpicId, setSelectedEpicId] = useState<string>(
    preselectedEpicId || ''
  );
  const [selectedDirectiveId, setSelectedDirectiveId] = useState<string>(
    preselectedDirectiveId || ''
  );
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState<
    ActivityType | undefined
  >();

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);
  const availableDirectives = selectedEpic?.directives || [];

  const handleSubmit = () => {
    if (!selectedEpicId || !selectedDirectiveId) {
      alert('Please select an epic and directive');
      return;
    }

    const durationMinutes = duration ? parseInt(duration, 10) : null;

    onSubmit({
      epicId: selectedEpicId,
      directiveId: selectedDirectiveId,
      note,
      durationMinutes,
      activityType: selectedActivityType,
    });

    // Reset form
    setNote('');
    setDuration('');
    setSelectedActivityType(undefined);
    if (!preselectedEpicId) setSelectedEpicId('');
    if (!preselectedDirectiveId) setSelectedDirectiveId('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(45, 45, 45, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: '28px',
            fontWeight: 600,
            color: '#2d2d2d',
            letterSpacing: '-0.02em',
          }}
        >
          Quick check-in
        </h2>
        <p
          style={{
            margin: '0 0 28px',
            fontSize: '15px',
            color: '#9a958e',
          }}
        >
          Log your progress for today
        </p>

        {/* Epic selection */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#7a756e',
              marginBottom: '8px',
            }}
          >
            Epic
          </label>
          <select
            value={selectedEpicId}
            onChange={(e) => {
              setSelectedEpicId(e.target.value);
              setSelectedDirectiveId('');
            }}
            disabled={!!preselectedEpicId}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '12px',
              color: '#2d2d2d',
              fontSize: '15px',
              fontFamily: 'inherit',
              cursor: preselectedEpicId ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Select an epic...</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.emoji} {epic.name}
              </option>
            ))}
          </select>
        </div>

        {/* Directive selection */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#7a756e',
              marginBottom: '8px',
            }}
          >
            Directive
          </label>
          <select
            value={selectedDirectiveId}
            onChange={(e) => setSelectedDirectiveId(e.target.value)}
            disabled={!selectedEpicId || !!preselectedDirectiveId}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '12px',
              color: '#2d2d2d',
              fontSize: '15px',
              fontFamily: 'inherit',
              cursor:
                !selectedEpicId || preselectedDirectiveId
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            <option value="">Select a directive...</option>
            {availableDirectives.map((directive) => (
              <option key={directive.id} value={directive.id}>
                {directive.name}
              </option>
            ))}
          </select>
        </div>

        {/* Note */}
        <textarea
          placeholder="What did you work on? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            width: '100%',
            height: '100px',
            padding: '18px',
            backgroundColor: '#fafaf8',
            border: '1px solid #eae6e1',
            borderRadius: '14px',
            color: '#2d2d2d',
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'none',
            marginBottom: '16px',
          }}
        />

        {/* Duration */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#7a756e',
              marginBottom: '8px',
            }}
          >
            Duration (minutes, optional)
          </label>
          <input
            type="number"
            placeholder="e.g., 60"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '12px',
              color: '#2d2d2d',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Activity type selector */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            margin: '20px 0 28px',
          }}
        >
          {activityTypes.map((type) => (
            <button
              key={type.key}
              onClick={() =>
                setSelectedActivityType(
                  selectedActivityType === type.key ? undefined : type.key
                )
              }
              style={{
                padding: '10px 16px',
                backgroundColor:
                  selectedActivityType === type.key ? '#2d2d2d' : '#fafaf8',
                border:
                  selectedActivityType === type.key
                    ? '1px solid #2d2d2d'
                    : '1px solid #eae6e1',
                borderRadius: '10px',
                color: selectedActivityType === type.key ? '#fff' : '#5a554e',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '14px',
              color: '#5a554e',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: '#2d2d2d',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Log it
          </button>
        </div>
      </div>
    </div>
  );
}

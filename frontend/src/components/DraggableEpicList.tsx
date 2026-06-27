import { useState } from 'react';
import type { Epic, Log, Directive } from '../lib/types';
import { EpicCard } from './EpicCard';

interface DraggableEpicListProps {
  epics: Epic[];
  logs: Log[];
  expandedEpics: Set<string>;
  onToggleExpanded: (epicId: string) => void;
  onCheckIn: (epicId: string, directiveId?: string) => void;
  onEditEpic: (epic: Epic) => void;
  onDeleteEpic: (epicId: string) => void;
  onAddDirective: (epicId: string) => void;
  onEditDirective: (epicId: string, directive: Directive) => void;
  onDeleteDirective: (epicId: string, directiveId: string) => void;
  onReorder: (reorderedEpics: Epic[]) => void;
}

export function DraggableEpicList({
  epics,
  logs,
  expandedEpics,
  onToggleExpanded,
  onCheckIn,
  onEditEpic,
  onDeleteEpic,
  onAddDirective,
  onEditDirective,
  onDeleteDirective,
  onReorder,
}: DraggableEpicListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  // Sort epics by order field if it exists, otherwise by creation date
  const sortedEpics = [...epics].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDraggedOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && draggedOverIndex !== null && draggedIndex !== draggedOverIndex) {
      const reordered = [...sortedEpics];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(draggedOverIndex, 0, removed);

      // Update order field for all epics
      const withOrder = reordered.map((epic, index) => ({
        ...epic,
        order: index,
      }));

      onReorder(withOrder);
    }
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sortedEpics.map((epic, index) => (
        <div
          key={epic.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          onDragLeave={handleDragLeave}
          style={{
            opacity: draggedIndex === index ? 0.5 : 1,
            transform: draggedOverIndex === index && draggedIndex !== null && draggedIndex < index ? 'translateY(8px)' : draggedOverIndex === index && draggedIndex !== null && draggedIndex > index ? 'translateY(-8px)' : 'none',
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            cursor: 'grab',
          }}
        >
          <EpicCard
            epic={epic}
            logs={logs.filter((log) => log.epicId === epic.id)}
            isExpanded={expandedEpics.has(epic.id)}
            onToggleExpanded={() => onToggleExpanded(epic.id)}
            onCheckIn={(directiveId) => onCheckIn(epic.id, directiveId)}
            onEdit={() => onEditEpic(epic)}
            onDelete={() => onDeleteEpic(epic.id)}
            onAddDirective={() => onAddDirective(epic.id)}
            onEditDirective={(directive) => onEditDirective(epic.id, directive)}
            onDeleteDirective={(directiveId) => onDeleteDirective(epic.id, directiveId)}
            epicIndex={index}
          />
        </div>
      ))}
    </div>
  );
}

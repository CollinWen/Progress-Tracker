import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import type { Epic, Directive, User } from '../lib/types';
import { DraggableEpicList } from './DraggableEpicList';
import { Header } from './Header';
import { useTheme } from '../contexts/ThemeContext';
import type { MomentumData } from '../lib/types';

interface EpicsListPageProps {
  data: MomentumData;
  user: User;
  onCheckIn: (epicId?: string, directiveId?: string) => void;
  onSignOut: () => void;
  onCreateEpic: () => void;
  onEditEpic: (epic: Epic) => void;
  onDeleteEpic: (epicId: string) => void;
  onReorderEpics?: (reorderedEpics: Epic[]) => Promise<void>;
  onCreateDirective: (epic: Epic) => void;
  onEditDirective: (epic: Epic, directive: Directive) => void;
  onDeleteDirective: (epicId: string, directiveId: string) => void;
  onLoadLogs: (options?: { epicId?: string; days?: number }) => Promise<void>;
  dashboardLogsLoaded: boolean;
}

export function EpicsListPage({
  data,
  user,
  onCheckIn,
  onSignOut,
  onCreateEpic,
  onEditEpic,
  onDeleteEpic,
  onReorderEpics,
  onCreateDirective,
  onEditDirective,
  onDeleteDirective,
  onLoadLogs,
  dashboardLogsLoaded,
}: EpicsListPageProps) {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // If navigated to directly (logs not yet fetched), fetch dashboard-level logs.
  useEffect(() => {
    if (!dashboardLogsLoaded) onLoadLogs({ days: 90 });
  }, []);

  const handleToggleExpanded = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  const allTags = Array.from(new Set(data.epics.flatMap((epic) => epic.tags || []))).sort();
  const filteredEpics = filterTag ? data.epics.filter((epic) => epic.tags?.includes(filterTag)) : data.epics;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <Header user={user} data={data} onCheckIn={() => onCheckIn()} onSignOut={onSignOut} onCreateEpic={onCreateEpic} />

      <main style={{ padding: '32px 40px 64px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 className="font-serif" style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}>
              All Epics
            </h1>
            <button
              onClick={() => navigate('/')}
              style={{ padding: '8px 16px', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={12} /> Dashboard
            </button>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: colors.textTertiary, fontWeight: 500 }}>Filter by tag:</span>
              <button
                onClick={() => setFilterTag(null)}
                style={{ padding: '5px 12px', backgroundColor: filterTag === null ? colors.text : 'transparent', color: filterTag === null ? colors.surface : colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                All ({data.epics.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  style={{ padding: '5px 12px', backgroundColor: filterTag === tag ? colors.text : 'transparent', color: filterTag === tag ? colors.surface : colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  {tag} ({data.epics.filter((e) => e.tags?.includes(tag)).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredEpics.length > 0 ? (
          <DraggableEpicList
            epics={filteredEpics}
            logs={data.logs}
            expandedEpics={expandedEpics}
            onToggleExpanded={handleToggleExpanded}
            onCheckIn={onCheckIn}
            onEditEpic={onEditEpic}
            onDeleteEpic={onDeleteEpic}
            onAddDirective={(epicId: string) => {
              const epic = data.epics.find((e) => e.id === epicId);
              if (epic) onCreateDirective(epic);
            }}
            onEditDirective={(epicId: string, directive: Directive) => {
              const epic = data.epics.find((e) => e.id === epicId);
              if (epic) onEditDirective(epic, directive);
            }}
            onDeleteDirective={onDeleteDirective}
            onReorder={onReorderEpics || (async () => {})}
          />
        ) : (
          <div className="empty-state">
            <Search size={36} color={colors.inactive} style={{ margin: '0 auto 14px' }} />
            <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>No epics found</div>
            <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '20px' }}>
              {filterTag ? `No epics with tag "${filterTag}"` : 'Create your first epic to get started'}
            </div>
            {filterTag && (
              <button
                onClick={() => setFilterTag(null)}
                style={{ padding: '10px 20px', backgroundColor: colors.text, border: `1px solid ${colors.text}`, borderRadius: 0, color: colors.surface, fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

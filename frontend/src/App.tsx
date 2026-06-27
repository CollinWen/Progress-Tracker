import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Flame, Clock, TrendingUp, CalendarCheck, Sparkles, Target, ArrowRight, ChevronUp } from 'lucide-react';

// ── v2 Section Label with tick rule ──────────────────────────────────────────
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <div style={{ width: '14px', height: '1px', backgroundColor: colors.text, flexShrink: 0 }} />
      <span className="section-label" style={{ margin: 0, flexShrink: 0 }}>{children}</span>
      <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
import { getDataService } from './services';
import {
  getSuggestedActions,
  countActiveDaysThisMonth,
  computeStreak,
  computeWeeklyHours,
  computeOverallConsistency,
} from './lib/computeDerivedData';
import { Header } from './components/Header';
import { SuggestedAction } from './components/SuggestedAction';
import { MomentumGraph } from './components/MomentumGraph';
import { CheckinModal, CheckinFormData } from './components/CheckinModal';
import { SignInPage } from './components/SignInPage';
import { OAuthCallback } from './components/OAuthCallback';
import { EpicModal } from './components/EpicModal';
import { DirectiveModal } from './components/DirectiveModal';
import { EpicDetailPage } from './components/EpicDetailPage';
import { EpicsListPage } from './components/EpicsListPage';
import { DraggableEpicList } from './components/DraggableEpicList';
import { useTheme } from './contexts/ThemeContext';
import type { MomentumData, Epic, Directive, Log, User } from './lib/types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<MomentumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [dashboardLogsLoaded, setDashboardLogsLoaded] = useState(false);

  // Modals
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | undefined>();
  const [editingDirective, setEditingDirective] = useState<{ epic: Epic; directive: Directive } | undefined>();
  const [preselectedEpicId, setPreselectedEpicId] = useState<string | undefined>();
  const [preselectedDirectiveId, setPreselectedDirectiveId] = useState<string | undefined>();

  // UI state
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  const service = getDataService();

  // Merge freshly fetched logs into data without duplicating IDs.
  const mergeLogs = (newLogs: Log[]) => {
    setData(prev => {
      if (!prev) return prev;
      const existingIds = new Set(prev.logs.map(l => l.id));
      const fresh = newLogs.filter(l => !existingIds.has(l.id));
      return fresh.length ? { ...prev, logs: [...prev.logs, ...fresh] } : prev;
    });
  };

  const handleLoadLogs = async (options?: { epicId?: string; days?: number }) => {
    try {
      const logs = await service.loadLogs(options);
      mergeLogs(logs);
      // Mark dashboard-level logs as loaded (any fetch without a specific epicId).
      if (!options?.epicId) setDashboardLogsLoaded(true);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const fileId = urlParams.get('fileId');
        const userName = urlParams.get('user');
        const errorParam = urlParams.get('error');
        const errorMessage = urlParams.get('message');

        if (errorParam) {
          setError(errorMessage || 'Authentication failed');
          window.history.replaceState({}, '', window.location.pathname);
          setIsLoading(false);
          return;
        }

        if (token && fileId && userName) {
          sessionStorage.setItem('momentum_token', token);
          sessionStorage.setItem('momentum_file_id', fileId);
          sessionStorage.setItem('momentum_user', JSON.stringify({
            name: decodeURIComponent(userName),
            createdAt: new Date().toISOString(),
          }));
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
          return;
        }

        // Wait for Firebase to check localStorage for a persisted session.
        // This resolves immediately if no session exists, or with the user if one does.
        const currentUser = await service.waitForAuth();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          // Fetch only epics — show the UI immediately, logs load per-page.
          const epics = await service.loadEpics();
          setData({ version: 1, user: currentUser, epics, logs: [] });
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleSignIn = async () => {
    try {
      setError(undefined);
      const signedInUser = await service.signIn();
      setUser(signedInUser);
      setIsAuthenticated(true);
      const loadedData = await service.loadData();
      setData(loadedData);
    } catch (err) {
      console.error('Sign-in error:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await service.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setData(null);
    } catch (err) {
      console.error('Sign-out error:', err);
      alert('Failed to sign out. Please try again.');
    }
  };

  const handleOpenCheckin = (epicId?: string, directiveId?: string) => {
    setPreselectedEpicId(epicId);
    setPreselectedDirectiveId(directiveId);
    setShowCheckinModal(true);
  };

  const handleCloseCheckin = () => {
    setShowCheckinModal(false);
    setPreselectedEpicId(undefined);
    setPreselectedDirectiveId(undefined);
  };

  const handleCheckinSubmit = async (formData: CheckinFormData) => {
    try {
      const newLog = await service.addLog({
        epicId: formData.epicId,
        directiveId: formData.directiveId,
        timestamp: new Date().toISOString(),
        durationMinutes: formData.durationMinutes,
        sessionType: formData.sessionType ?? null,
        note: formData.note,
        source: 'manual',
      });

      if (data) {
        setData({ ...data, logs: [...data.logs, newLog] });
      }

      handleCloseCheckin();
    } catch (err) {
      console.error('Failed to add log:', err);
      alert(err instanceof Error ? err.message : 'Failed to save check-in');
    }
  };

  const handleCreateEpic = () => {
    setEditingEpic(undefined);
    setShowEpicModal(true);
  };

  const handleEditEpic = (epic: Epic) => {
    setEditingEpic(epic);
    setShowEpicModal(true);
  };

  const handleSaveEpic = async (epicData: Partial<Epic>) => {
    try {
      if (editingEpic) {
        await service.updateEpic(editingEpic.id, epicData);
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) => e.id === editingEpic.id ? { ...e, ...epicData } : e),
          });
        }
      } else {
        const newEpic = await service.addEpic(epicData as any);
        if (data) {
          setData({ ...data, epics: [...data.epics, newEpic] });
        }
      }
      setShowEpicModal(false);
      setEditingEpic(undefined);
    } catch (err) {
      console.error('Failed to save epic:', err);
      throw err;
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm('Are you sure you want to delete this epic? This will also delete all associated logs.')) return;

    try {
      await service.deleteEpic(epicId);
      if (data) {
        setData({
          ...data,
          epics: data.epics.filter((e) => e.id !== epicId),
          logs: data.logs.filter((log) => log.epicId !== epicId),
        });
      }
    } catch (err) {
      console.error('Failed to delete epic:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete epic');
    }
  };

  const handleReorderEpics = async (reorderedEpics: Epic[]) => {
    try {
      if (data) {
        setData({ ...data, epics: reorderedEpics });
      }
      await Promise.all(
        reorderedEpics.map((epic) => service.updateEpic(epic.id, { order: epic.order }))
      );
    } catch (err) {
      console.error('Failed to reorder epics:', err);
      alert(err instanceof Error ? err.message : 'Failed to save new order');
      const reloadedData = await service.loadData();
      setData(reloadedData);
    }
  };

  const handleCreateDirective = (epic: Epic) => {
    setEditingDirective(undefined);
    setPreselectedEpicId(epic.id);
    setShowDirectiveModal(true);
  };

  const handleEditDirective = (epic: Epic, directive: Directive) => {
    setEditingDirective({ epic, directive });
    setShowDirectiveModal(true);
  };

  const handleSaveDirective = async (directiveData: Partial<Directive>) => {
    try {
      if (editingDirective) {
        await service.updateDirective(editingDirective.epic.id, editingDirective.directive.id, directiveData);
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) =>
              e.id === editingDirective.epic.id
                ? { ...e, directives: e.directives.map((d) => d.id === editingDirective.directive.id ? { ...d, ...directiveData } : d) }
                : e
            ),
          });
        }
      } else if (preselectedEpicId) {
        const newDirective = await service.addDirective(preselectedEpicId, directiveData as any);
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) =>
              e.id === preselectedEpicId ? { ...e, directives: [...e.directives, newDirective] } : e
            ),
          });
        }
      }

      setShowDirectiveModal(false);
      setEditingDirective(undefined);
      setPreselectedEpicId(undefined);
    } catch (err) {
      console.error('Failed to save directive:', err);
      throw err;
    }
  };

  const handleDeleteDirective = async (epicId: string, directiveId: string) => {
    if (!confirm('Are you sure you want to delete this directive? This will also delete all associated logs.')) return;

    try {
      await service.deleteDirective(epicId, directiveId);
      if (data) {
        setData({
          ...data,
          epics: data.epics.map((e) =>
            e.id === epicId ? { ...e, directives: e.directives.filter((d) => d.id !== directiveId) } : e
          ),
          logs: data.logs.filter((log) => !(log.epicId === epicId && log.directiveId === directiveId)),
        });
      }
    } catch (err) {
      console.error('Failed to delete directive:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete directive');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route
          path="/"
          element={
            !isAuthenticated ? (
              <SignInPage onSignIn={handleSignIn} error={error} />
            ) : (
              <MainApp
                data={data}
                user={user!}
                expandedEpics={expandedEpics}
                setExpandedEpics={setExpandedEpics}
                onCheckIn={handleOpenCheckin}
                onReorderEpics={handleReorderEpics}
                onSignOut={handleSignOut}
                onCreateEpic={handleCreateEpic}
                onEditEpic={handleEditEpic}
                onDeleteEpic={handleDeleteEpic}
                onCreateDirective={handleCreateDirective}
                onEditDirective={handleEditDirective}
                onDeleteDirective={handleDeleteDirective}
                onLoadLogs={handleLoadLogs}
              />
            )
          }
        />
        <Route
          path="/epics"
          element={
            !isAuthenticated ? (
              <Navigate to="/" />
            ) : data ? (
              <EpicsListPage
                data={data}
                user={user!}
                onCheckIn={handleOpenCheckin}
                onSignOut={handleSignOut}
                onCreateEpic={handleCreateEpic}
                onEditEpic={handleEditEpic}
                onDeleteEpic={handleDeleteEpic}
                onReorderEpics={handleReorderEpics}
                onCreateDirective={handleCreateDirective}
                onEditDirective={handleEditDirective}
                onDeleteDirective={handleDeleteDirective}
                onLoadLogs={handleLoadLogs}
                dashboardLogsLoaded={dashboardLogsLoaded}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/epic/:epicId"
          element={
            !isAuthenticated ? (
              <Navigate to="/" />
            ) : data ? (
              <EpicDetailPage
                epics={data.epics}
                logs={data.logs}
                onCheckIn={handleOpenCheckin}
                onEditEpic={handleEditEpic}
                onDeleteEpic={handleDeleteEpic}
                onAddDirective={handleCreateDirective}
                onEditDirective={handleEditDirective}
                onDeleteDirective={handleDeleteDirective}
                onLoadLogs={handleLoadLogs}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {showCheckinModal && data && (
        <CheckinModal
          isOpen={showCheckinModal}
          onClose={handleCloseCheckin}
          onSubmit={handleCheckinSubmit}
          epics={data.epics}
          preselectedEpicId={preselectedEpicId}
          preselectedDirectiveId={preselectedDirectiveId}
        />
      )}

      {showEpicModal && (
        <EpicModal
          epic={editingEpic}
          onSave={handleSaveEpic}
          onClose={() => { setShowEpicModal(false); setEditingEpic(undefined); }}
        />
      )}

      {showDirectiveModal && (
        <DirectiveModal
          directive={editingDirective?.directive}
          onSave={handleSaveDirective}
          onClose={() => {
            setShowDirectiveModal(false);
            setEditingDirective(undefined);
            setPreselectedEpicId(undefined);
          }}
        />
      )}
    </BrowserRouter>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={36} color={colors.textTertiary} className="spin" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: '15px', color: colors.textSecondary }}>Loading…</div>
      </div>
    </div>
  );
}

// ── MainApp ───────────────────────────────────────────────────────────────────
interface MainAppProps {
  data: MomentumData | null;
  user: User;
  expandedEpics: Set<string>;
  setExpandedEpics: (epics: Set<string>) => void;
  onCheckIn: (epicId?: string, directiveId?: string) => void;
  onSignOut: () => void;
  onCreateEpic: () => void;
  onEditEpic: (epic: Epic) => void;
  onDeleteEpic: (epicId: string) => void;
  onReorderEpics: (reorderedEpics: Epic[]) => Promise<void>;
  onCreateDirective: (epic: Epic) => void;
  onEditDirective: (epic: Epic, directive: Directive) => void;
  onDeleteDirective: (epicId: string, directiveId: string) => void;
  onLoadLogs: (options?: { epicId?: string; days?: number }) => Promise<void>;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function MainApp({
  data,
  user,
  expandedEpics,
  setExpandedEpics,
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
}: MainAppProps) {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [showAllEpics, setShowAllEpics] = useState(false);

  // Load the last 90 days of logs when the dashboard mounts.
  useEffect(() => {
    onLoadLogs({ days: 90 });
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

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
        <Header user={user} data={null} onCheckIn={() => onCheckIn()} onSignOut={onSignOut} onCreateEpic={onCreateEpic} />
        <main style={{ padding: '40px', maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <Loader2 size={32} color={colors.textTertiary} className="spin" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '15px', color: colors.textSecondary }}>Loading your data…</div>
          </div>
        </main>
      </div>
    );
  }

  const suggestedActions = getSuggestedActions(data, 4);
  const activeDaysThisMonth = countActiveDaysThisMonth(data.logs);
  const streak = computeStreak(data.logs);
  const weeklyHours = computeWeeklyHours(data.logs);
  const consistency = computeOverallConsistency(data);
  const fullDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const epicsList = (
    <DraggableEpicList
      epics={data.epics}
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
      onReorder={onReorderEpics}
    />
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, color: colors.text }}>
      <Header user={user} data={data} onCheckIn={() => onCheckIn()} onSignOut={onSignOut} onCreateEpic={onCreateEpic} />

      <main style={{ padding: '32px 40px 64px', maxWidth: '1280px', margin: '0 auto' }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', color: colors.textTertiary, fontWeight: 500, marginBottom: '6px' }}>
            {fullDate}
          </div>
          <h2 className="font-serif" style={{ margin: 0, fontSize: '38px', fontWeight: 600, color: colors.text, letterSpacing: '-0.03em', marginBottom: '20px' }}>
            {getGreeting()}, {user.name}
          </h2>

          {/* ── Stats row ── */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatChip
              icon={<Flame size={14} />}
              value={streak > 0 ? `${streak}` : '—'}
              label="day streak"
              highlight={streak >= 3}
            />
            <StatChip
              icon={<Clock size={14} />}
              value={weeklyHours > 0 ? `${weeklyHours}h` : '—'}
              label="this week"
            />
            <StatChip
              icon={<TrendingUp size={14} />}
              value={consistency > 0 ? `${consistency}%` : '—'}
              label="consistent"
              highlight={consistency >= 50}
            />
            <StatChip
              icon={<CalendarCheck size={14} />}
              value={`${activeDaysThisMonth}`}
              label={activeDaysThisMonth === 1 ? 'day active' : 'days active'}
            />
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gap: '24px', alignItems: 'start' }} className="home-grid">

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Suggested Next ── */}
            <section>
              <SectionLabel action={suggestedActions.length > 0 && (
                <button
                  onClick={() => navigate('/epics')}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: colors.textTertiary, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                >
                  All epics <ArrowRight size={11} />
                </button>
              )}>
                <Sparkles size={10} style={{ marginRight: '4px' }} />
                Suggested Next
              </SectionLabel>
              {suggestedActions.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {suggestedActions.slice(0, 4).map((action) => (
                    <SuggestedAction
                      key={`${action.epic.id}-${action.directive.id}`}
                      action={action}
                      onCheckIn={() => onCheckIn(action.epic.id, action.directive.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Sparkles size={36} color={colors.inactive} style={{ margin: '0 auto 14px' }} />
                  <div style={{ fontSize: '14px', color: colors.textTertiary }}>
                    Log your first check-in to get suggestions
                  </div>
                </div>
              )}
            </section>

            {/* ── Momentum Graph ── */}
            <section>
              <MomentumGraph data={data} />
            </section>

            {/* ── Recent Activity ── */}
            {data.logs.length > 0 && (
              <section>
                <RecentLogFeed data={data} />
              </section>
            )}
          </div>

          {/* Right column — Epics */}
          <section>
            {data.epics.length > 0 ? (
              showAllEpics ? (
                <>
                  <SectionLabel action={
                    <button
                      onClick={() => setShowAllEpics(false)}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: colors.textTertiary, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      <ChevronUp size={11} /> Collapse
                    </button>
                  }>All Epics</SectionLabel>
                  {epicsList}
                </>
              ) : (
                <>
                  <SectionLabel action={
                    <button
                      onClick={() => setShowAllEpics(true)}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', color: colors.textTertiary, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      Show all <ArrowRight size={11} />
                    </button>
                  }>Epics</SectionLabel>
                  {epicsList}
                </>
              )
            ) : (
              <div className="empty-state">
                <Target size={36} color={colors.inactive} style={{ margin: '0 auto 14px' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>No epics yet</div>
                <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '20px' }}>
                  Create your first epic to start tracking progress
                </div>
                <button
                  onClick={onCreateEpic}
                  style={{ padding: '12px 24px', backgroundColor: colors.text, border: `1px solid ${colors.text}`, borderRadius: 0, color: colors.surface, fontSize: '10px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' }}
                >
                  + Create Epic
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ── StatChip ──────────────────────────────────────────────────────────────────
interface StatChipProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  highlight?: boolean;
}

function StatChip({ icon, value, label, highlight = false }: StatChipProps) {
  const { colors } = useTheme();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      backgroundColor: highlight ? colors.accentLight : colors.surface,
      border: `1px solid ${highlight ? colors.accent + '33' : colors.border}`,
      borderRadius: 0,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: highlight ? colors.accent : colors.textTertiary, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontSize: '18px', fontWeight: 700, color: highlight ? colors.accent : colors.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '12px', color: colors.textTertiary, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── RecentLogFeed ─────────────────────────────────────────────────────────────
function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function RecentLogFeed({ data }: { data: MomentumData }) {
  const { colors } = useTheme();
  const recentLogs = [...data.logs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  if (recentLogs.length === 0) return null;

  return (
    <div style={{ backgroundColor: colors.surface, borderRadius: 0, border: `1px solid ${colors.border}`, padding: '24px 28px' }}>
      <SectionLabel>Recent Activity</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {recentLogs.map((log, i) => {
          const epic = data.epics.find(e => e.id === log.epicId);
          const directive = epic?.directives.find(d => d.id === log.directiveId);
          if (!epic || !directive) return null;
          const isLast = i === recentLogs.length - 1;

          return (
            <div key={log.id} style={{
              display: 'flex',
              gap: '14px',
              paddingBottom: isLast ? 0 : '14px',
              marginBottom: isLast ? 0 : '14px',
              borderBottom: isLast ? 'none' : `1px solid ${colors.borderLight}`,
              alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '2px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: 0, backgroundColor: epic.color, flexShrink: 0 }} />
                {!isLast && <div style={{ width: '1px', flex: 1, backgroundColor: colors.graphEmpty, marginTop: '4px' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {directive.name}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.inactive, flexShrink: 0 }}>{timeAgo(log.timestamp)}</div>
                </div>
                <div style={{ fontSize: '12px', color: colors.textTertiary, marginBottom: log.note ? '4px' : 0 }}>
                  {epic.name}
                  {log.durationMinutes && (
                    <span style={{ marginLeft: '6px', color: colors.inactive }}>
                      · {Math.round(log.durationMinutes / 60 * 10) / 10}h
                    </span>
                  )}
                  {log.sessionType && (
                    <span style={{ marginLeft: '6px', padding: '1px 6px', backgroundColor: colors.tagBg, borderRadius: '3px', fontSize: '10px', color: colors.textTertiary, textTransform: 'capitalize' }}>
                      {log.sessionType}
                    </span>
                  )}
                </div>
                {log.note && (
                  <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {log.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

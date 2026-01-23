import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getDataService } from './services';
import { getSuggestedActions } from './lib/computeDerivedData';
import { Header } from './components/Header';
import { EpicCard } from './components/EpicCard';
import { SuggestedAction } from './components/SuggestedAction';
import { CheckinModal, CheckinFormData } from './components/CheckinModal';
import { SignInPage } from './components/SignInPage';
import { OAuthCallback } from './components/OAuthCallback';
import { EpicModal } from './components/EpicModal';
import { DirectiveModal } from './components/DirectiveModal';
import type { MomentumData, Epic, Directive, User } from './lib/types';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<MomentumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Modals
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showEpicModal, setShowEpicModal] = useState(false);
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | undefined>();
  const [editingDirective, setEditingDirective] = useState<{ epic: Epic; directive: Directive } | undefined>();
  const [preselectedEpicId, setPreselectedEpicId] = useState<string | undefined>();
  const [preselectedDirectiveId, setPreselectedDirectiveId] = useState<string | undefined>();

  // UI state
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);

  const service = getDataService();

  // Initialize app - check authentication
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if we're returning from backend OAuth with token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const fileId = urlParams.get('fileId');
        const userName = urlParams.get('user');
        const errorParam = urlParams.get('error');
        const errorMessage = urlParams.get('message');

        // Handle OAuth error from backend
        if (errorParam) {
          setError(errorMessage || 'Authentication failed');
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
          setIsLoading(false);
          return;
        }

        // Handle successful OAuth redirect from backend
        if (token && fileId && userName) {
          console.log('Received OAuth callback from backend, saving session...');

          // Save to sessionStorage
          sessionStorage.setItem('momentum_token', token);
          sessionStorage.setItem('momentum_file_id', fileId);
          sessionStorage.setItem('momentum_user', JSON.stringify({
            name: decodeURIComponent(userName),
            createdAt: new Date().toISOString(),
          }));

          // Clean up URL to remove sensitive token
          window.history.replaceState({}, '', window.location.pathname);

          // Reload to reinitialize with new session
          window.location.reload();
          return;
        }

        // Normal initialization - check if already authenticated
        if (service.isAuthenticated()) {
          const currentUser = service.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);

            // Load data
            const loadedData = await service.loadData();
            setData(loadedData);
          }
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

  // Sign in handler
  const handleSignIn = async () => {
    try {
      setError(undefined);
      const signedInUser = await service.signIn();
      setUser(signedInUser);
      setIsAuthenticated(true);

      // Load data after sign-in
      const loadedData = await service.loadData();
      setData(loadedData);
    } catch (err) {
      console.error('Sign-in error:', err);
      throw err; // Re-throw for SignInPage to handle
    }
  };

  // Sign out handler
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

  // Check-in handlers
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
        note: formData.note,
        source: 'manual',
      });

      // Optimistically update data
      if (data) {
        setData({
          ...data,
          logs: [...data.logs, newLog],
        });
      }

      handleCloseCheckin();
    } catch (err) {
      console.error('Failed to add log:', err);
      alert(err instanceof Error ? err.message : 'Failed to save check-in');
    }
  };

  // Epic handlers
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
        // Update existing epic
        await service.updateEpic(editingEpic.id, epicData);

        // Optimistically update data
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) =>
              e.id === editingEpic.id ? { ...e, ...epicData } : e
            ),
          });
        }
      } else {
        // Create new epic
        const newEpic = await service.addEpic(epicData as any);

        // Optimistically update data
        if (data) {
          setData({
            ...data,
            epics: [...data.epics, newEpic],
          });
        }
      }

      setShowEpicModal(false);
      setEditingEpic(undefined);
    } catch (err) {
      console.error('Failed to save epic:', err);
      throw err; // Let modal handle error display
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!confirm('Are you sure you want to delete this epic? This will also delete all associated logs.')) {
      return;
    }

    try {
      await service.deleteEpic(epicId);

      // Optimistically update data
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

  // Directive handlers
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
        // Update existing directive
        await service.updateDirective(
          editingDirective.epic.id,
          editingDirective.directive.id,
          directiveData
        );

        // Optimistically update data
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) =>
              e.id === editingDirective.epic.id
                ? {
                    ...e,
                    directives: e.directives.map((d) =>
                      d.id === editingDirective.directive.id ? { ...d, ...directiveData } : d
                    ),
                  }
                : e
            ),
          });
        }
      } else if (preselectedEpicId) {
        // Create new directive
        const newDirective = await service.addDirective(preselectedEpicId, directiveData as any);

        // Optimistically update data
        if (data) {
          setData({
            ...data,
            epics: data.epics.map((e) =>
              e.id === preselectedEpicId
                ? { ...e, directives: [...e.directives, newDirective] }
                : e
            ),
          });
        }
      }

      setShowDirectiveModal(false);
      setEditingDirective(undefined);
      setPreselectedEpicId(undefined);
    } catch (err) {
      console.error('Failed to save directive:', err);
      throw err; // Let modal handle error display
    }
  };

  const handleDeleteDirective = async (epicId: string, directiveId: string) => {
    if (!confirm('Are you sure you want to delete this directive? This will also delete all associated logs.')) {
      return;
    }

    try {
      await service.deleteDirective(epicId, directiveId);

      // Optimistically update data
      if (data) {
        setData({
          ...data,
          epics: data.epics.map((e) =>
            e.id === epicId
              ? { ...e, directives: e.directives.filter((d) => d.id !== directiveId) }
              : e
          ),
          logs: data.logs.filter((log) => !(log.epicId === epicId && log.directiveId === directiveId)),
        });
      }
    } catch (err) {
      console.error('Failed to delete directive:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete directive');
    }
  };

  // Routing
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f5f2'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', color: '#7a756e' }}>Loading...</div>
        </div>
      </div>
    );
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
                expandedEpicId={expandedEpicId}
                setExpandedEpicId={setExpandedEpicId}
                onCheckIn={handleOpenCheckin}
                onSignOut={handleSignOut}
                onCreateEpic={handleCreateEpic}
                onEditEpic={handleEditEpic}
                onDeleteEpic={handleDeleteEpic}
                onCreateDirective={handleCreateDirective}
                onEditDirective={handleEditDirective}
                onDeleteDirective={handleDeleteDirective}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Modals */}
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
          onClose={() => {
            setShowEpicModal(false);
            setEditingEpic(undefined);
          }}
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

// Main application UI (when authenticated)
interface MainAppProps {
  data: MomentumData | null;
  user: User;
  expandedEpicId: string | null;
  setExpandedEpicId: (id: string | null) => void;
  onCheckIn: (epicId?: string, directiveId?: string) => void;
  onSignOut: () => void;
  onCreateEpic: () => void;
  onEditEpic: (epic: Epic) => void;
  onDeleteEpic: (epicId: string) => void;
  onCreateDirective: (epic: Epic) => void;
  onEditDirective: (epic: Epic, directive: Directive) => void;
  onDeleteDirective: (epicId: string, directiveId: string) => void;
}

function MainApp({
  data,
  user,
  expandedEpicId,
  setExpandedEpicId,
  onCheckIn,
  onSignOut,
  onCreateEpic,
  onEditEpic,
  onDeleteEpic,
  onCreateDirective,
  onEditDirective,
  onDeleteDirective,
}: MainAppProps) {
  // If data is still loading, show loading state
  if (!data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f7f5f2',
          color: '#2d2d2d',
        }}
      >
        <Header
          user={user}
          onCheckIn={() => onCheckIn()}
          onSignOut={onSignOut}
          onCreateEpic={onCreateEpic}
        />
        <main style={{ padding: '40px', maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '16px', color: '#7a756e' }}>Loading your data...</div>
          </div>
        </main>
      </div>
    );
  }

  // Get suggested actions
  const suggestedActions = getSuggestedActions(data, 4);

  // Calculate day of year
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f7f5f2',
        color: '#2d2d2d',
      }}
    >
      <Header
        user={user}
        onCheckIn={() => onCheckIn()}
        onSignOut={onSignOut}
        onCreateEpic={onCreateEpic}
      />

      <main style={{ padding: '40px', maxWidth: '960px', margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '14px',
              color: '#9a958e',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            Day {dayOfYear} of {today.getFullYear()}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: '40px',
              fontWeight: 600,
              color: '#2d2d2d',
              letterSpacing: '-0.03em',
            }}
          >
            {getGreeting()}, {user.name}
          </h2>
        </div>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <section style={{ marginBottom: '56px' }}>
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: '#5a554e',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Suggested Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestedActions.map((action) => (
                <SuggestedAction
                  key={`${action.epic.id}-${action.directive.id}`}
                  action={action}
                  onCheckIn={() => onCheckIn(action.epic.id, action.directive.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Epics List */}
        {data.epics.length > 0 ? (
          <section>
            <h3
              style={{
                margin: '0 0 20px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: '#5a554e',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Your Epics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {data.epics.map((epic) => (
                <EpicCard
                  key={epic.id}
                  epic={epic}
                  logs={data.logs}
                  isExpanded={expandedEpicId === epic.id}
                  onToggleExpanded={() =>
                    setExpandedEpicId(expandedEpicId === epic.id ? null : epic.id)
                  }
                  onCheckIn={(directiveId: string) => onCheckIn(epic.id, directiveId)}
                  onEdit={() => onEditEpic(epic)}
                  onDelete={() => onDeleteEpic(epic.id)}
                  onAddDirective={() => onCreateDirective(epic)}
                  onEditDirective={(directive: Directive) => onEditDirective(epic, directive)}
                  onDeleteDirective={(directiveId: string) => onDeleteDirective(epic.id, directiveId)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: '#fff',
            borderRadius: '20px',
            border: '2px dashed #eae6e1'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#2d2d2d', marginBottom: '8px' }}>
              No epics yet
            </div>
            <div style={{ fontSize: '14px', color: '#7a756e', marginBottom: '24px' }}>
              Create your first epic to start tracking progress
            </div>
            <button
              onClick={onCreateEpic}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2d2d2d',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create Epic
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

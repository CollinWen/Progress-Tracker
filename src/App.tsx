import { useState } from 'react';
import { useMomentumData } from './hooks/useMomentumData';
import { getSuggestedActions } from './lib/computeDerivedData';
import { Header } from './components/Header';
import { EpicCard } from './components/EpicCard';
import { SuggestedAction } from './components/SuggestedAction';
import { CheckinModal, CheckinFormData } from './components/CheckinModal';

function App() {
  const { data, addLog } = useMomentumData();
  const [expandedEpicId, setExpandedEpicId] = useState<string | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [preselectedEpicId, setPreselectedEpicId] = useState<string | undefined>();
  const [preselectedDirectiveId, setPreselectedDirectiveId] = useState<string | undefined>();

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

  // Handle opening check-in modal
  const handleOpenCheckin = (epicId?: string, directiveId?: string) => {
    setPreselectedEpicId(epicId);
    setPreselectedDirectiveId(directiveId);
    setShowCheckinModal(true);
  };

  // Handle closing check-in modal
  const handleCloseCheckin = () => {
    setShowCheckinModal(false);
    setPreselectedEpicId(undefined);
    setPreselectedDirectiveId(undefined);
  };

  // Handle check-in submission
  const handleCheckinSubmit = (formData: CheckinFormData) => {
    addLog({
      epicId: formData.epicId,
      directiveId: formData.directiveId,
      timestamp: new Date().toISOString(),
      durationMinutes: formData.durationMinutes,
      note: formData.note,
      source: 'manual',
    });

    handleCloseCheckin();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f7f5f2',
        color: '#2d2d2d',
      }}
    >
      <Header onCheckIn={() => handleOpenCheckin()} />

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
            {getGreeting()}, {data.user.name}
          </h2>
        </div>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <section style={{ marginBottom: '56px' }}>
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#9a958e',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Suggested next
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {suggestedActions.map((action) => (
                <SuggestedAction
                  key={action.directive.id}
                  action={action}
                  onLog={() =>
                    handleOpenCheckin(action.epic.id, action.directive.id)
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Epics */}
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 700,
                color: '#9a958e',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Your Epics
            </h3>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#fafaf8',
                border: '1px solid #eae6e1',
                borderRadius: '10px',
                color: '#5a554e',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + New Epic
            </button>
          </div>

          {data.epics.map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              logs={data.logs}
              isExpanded={expandedEpicId === epic.id}
              onToggle={() =>
                setExpandedEpicId(expandedEpicId === epic.id ? null : epic.id)
              }
              onLogDirective={(epicId, directiveId) =>
                handleOpenCheckin(epicId, directiveId)
              }
            />
          ))}
        </section>
      </main>

      <CheckinModal
        isOpen={showCheckinModal}
        onClose={handleCloseCheckin}
        onSubmit={handleCheckinSubmit}
        epics={data.epics}
        preselectedEpicId={preselectedEpicId}
        preselectedDirectiveId={preselectedDirectiveId}
      />
    </div>
  );
}

export default App;

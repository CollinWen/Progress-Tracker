import React, { useState } from 'react';

// Activity types with optional emoji
const activityTypes = {
  build: { label: 'Build', emoji: '🛠', color: '#2d2d2d' },
  learn: { label: 'Learn', emoji: '📚', color: '#2d2d2d' },
  train: { label: 'Train', emoji: '💪', color: '#2d2d2d' },
  research: { label: 'Research', emoji: '🔍', color: '#2d2d2d' },
  plan: { label: 'Plan', emoji: '🎯', color: '#2d2d2d' },
  arrange: { label: 'Arrange', emoji: '📋', color: '#2d2d2d' },
};

// Sample data
const sampleEpics = [
  {
    id: 1,
    name: 'Lighting Business',
    emoji: '💡',
    description: 'Computational paper lamps → market',
    phase: 'building',
    directives: [
      { id: 1, name: 'Assembly mechanism R&D', type: 'build', interval: 'weekly', lastCheckin: '2025-01-01', daysActive: 8, hoursLogged: 12 },
      { id: 2, name: 'Unfolding algorithm', type: 'build', interval: 'weekly', lastCheckin: '2024-12-28', daysActive: 5, hoursLogged: 8 },
      { id: 3, name: 'Market & pricing research', type: 'research', interval: 'biweekly', lastCheckin: '2024-12-20', daysActive: 3, hoursLogged: 4 },
      { id: 4, name: 'Store setup & fulfillment', type: 'arrange', interval: 'monthly', lastCheckin: '2024-12-15', daysActive: 1, hoursLogged: 2 },
    ],
    commitHistory: generateCommitHistory(0.4),
  },
  {
    id: 2,
    name: 'Race Season 2025',
    emoji: '🏃',
    description: 'Half marathon + triathlon',
    phase: 'active',
    deadline: '2025-06-15',
    target: { current: 0, total: 2, unit: 'races' },
    directives: [
      { id: 5, name: 'Structured training', type: 'train', interval: 'weekly', lastCheckin: '2025-01-02', daysActive: 18, hoursLogged: 24 },
      { id: 6, name: 'FTP & performance tracking', type: 'research', interval: 'biweekly', lastCheckin: '2025-01-01', daysActive: 4, hoursLogged: 3 },
      { id: 7, name: 'Race registration & logistics', type: 'arrange', interval: 'monthly', lastCheckin: '2024-12-10', daysActive: 2, hoursLogged: 1 },
    ],
    commitHistory: generateCommitHistory(0.7),
  },
  {
    id: 3,
    name: 'Deep Reading',
    emoji: '📖',
    description: 'Books + academic papers',
    phase: 'active',
    target: { current: 1, total: 5, unit: 'books' },
    directives: [
      { id: 8, name: 'Book reading', type: 'learn', interval: 'daily', lastCheckin: '2025-01-02', daysActive: 22, hoursLogged: 18 },
      { id: 9, name: 'Paper reading (3-4/month)', type: 'learn', interval: 'weekly', lastCheckin: '2024-12-29', daysActive: 6, hoursLogged: 8 },
    ],
    commitHistory: generateCommitHistory(0.6),
  },
  {
    id: 4,
    name: 'Side Projects',
    emoji: '⚡',
    description: '4 meaningful builds this year',
    phase: 'exploring',
    target: { current: 0, total: 4, unit: 'projects' },
    directives: [
      { id: 10, name: 'This app (Momentum)', type: 'build', interval: 'weekly', lastCheckin: '2025-01-02', daysActive: 3, hoursLogged: 6 },
      { id: 11, name: 'Project ideation', type: 'plan', interval: 'biweekly', lastCheckin: '2024-12-18', daysActive: 2, hoursLogged: 2 },
    ],
    commitHistory: generateCommitHistory(0.3),
  },
  {
    id: 5,
    name: 'Academic Course',
    emoji: '🎓',
    description: 'Complete one structured course',
    phase: 'paused',
    target: { current: 0, total: 1, unit: 'course' },
    directives: [
      { id: 12, name: 'Course selection', type: 'research', interval: 'monthly', lastCheckin: '2024-12-01', daysActive: 1, hoursLogged: 1 },
      { id: 13, name: 'Weekly lessons', type: 'learn', interval: 'weekly', lastCheckin: null, daysActive: 0, hoursLogged: 0 },
    ],
    commitHistory: generateCommitHistory(0.1),
  },
  {
    id: 6,
    name: 'Daily Practice',
    emoji: '🌱',
    description: 'Chinese, cooking, screen discipline',
    phase: 'active',
    directives: [
      { id: 14, name: 'Chinese practice', type: 'learn', interval: 'daily', lastCheckin: '2025-01-02', daysActive: 14, hoursLogged: 7 },
      { id: 15, name: 'Cooking (3x/week)', type: 'build', interval: 'weekly', lastCheckin: '2025-01-01', daysActive: 12, hoursLogged: 10 },
      { id: 16, name: 'Screen time review', type: 'plan', interval: 'daily', lastCheckin: '2025-01-02', daysActive: 8, hoursLogged: 0 },
    ],
    commitHistory: generateCommitHistory(0.65),
  },
];

function generateCommitHistory(density) {
  return Array.from({ length: 52 }, () => Math.random() < density ? 1 : 0);
}

// Commit graph - rounded squares
function CommitGraph({ history }) {
  const weeks = [];
  for (let i = 0; i < history.length; i += 7) {
    weeks.push(history.slice(i, i + 7));
  }
  
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {week.map((day, di) => (
            <div
              key={di}
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '2px',
                backgroundColor: day ? '#2d2d2d' : '#e9e5e0',
                opacity: day ? 0.25 + (0.75 * ((wi * 7 + di) / history.length)) : 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Phase badge
function PhaseBadge({ phase }) {
  const config = {
    exploring: { bg: '#f0ebe4', color: '#8a7f72' },
    building: { bg: '#e8efe8', color: '#5c6e5c' },
    active: { bg: '#e5f0f0', color: '#4a7171' },
    refining: { bg: '#f0e8f0', color: '#6e5c6e' },
    paused: { bg: '#f5f3f0', color: '#a09890' },
  };
  
  const style = config[phase] || config.active;
  
  return (
    <span style={{
      padding: '6px 14px',
      backgroundColor: style.bg,
      color: style.color,
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {phase}
    </span>
  );
}

// Directive row
function DirectiveRow({ directive, epicEmoji }) {
  const daysSince = directive.lastCheckin 
    ? Math.floor((new Date() - new Date(directive.lastCheckin)) / (1000 * 60 * 60 * 24))
    : null;
  
  const isOverdue = daysSince !== null && (
    (directive.interval === 'daily' && daysSince > 1) ||
    (directive.interval === 'weekly' && daysSince > 7) ||
    (directive.interval === 'biweekly' && daysSince > 14) ||
    (directive.interval === 'monthly' && daysSince > 30)
  );
  
  return (
    <div style={{
      padding: '18px 20px',
      backgroundColor: isOverdue ? '#fffbf5' : '#fafaf8',
      borderRadius: '14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: isOverdue ? '1px solid #f0e0c8' : '1px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '16px' }}>{activityTypes[directive.type].emoji}</span>
        <div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 500,
            color: '#2d2d2d',
            marginBottom: '2px',
          }}>
            {directive.name}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#9a958e',
          }}>
            {directive.interval} check-in
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 600,
            color: '#2d2d2d',
            lineHeight: 1,
          }}>
            {directive.daysActive}
          </div>
          <div style={{ fontSize: '12px', color: '#9a958e' }}>days</div>
        </div>
        <div style={{
          fontSize: '13px',
          color: isOverdue ? '#c49a5c' : '#9a958e',
          minWidth: '55px',
          textAlign: 'right',
        }}>
          {daysSince === null ? 'not yet' : daysSince === 0 ? 'today' : `${daysSince}d ago`}
        </div>
        <button style={{
          padding: '10px 18px',
          backgroundColor: '#2d2d2d',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}>
          Log
        </button>
      </div>
    </div>
  );
}

// Epic card
function EpicCard({ epic, isExpanded, onToggle }) {
  const totalDays = epic.directives.reduce((sum, d) => sum + d.daysActive, 0);
  const totalHours = epic.directives.reduce((sum, d) => sum + d.hoursLogged, 0);
  const recentDensity = Math.round((epic.commitHistory.slice(-14).reduce((a, b) => a + b, 0) / 14) * 100);
  
  const daysUntilDeadline = epic.deadline 
    ? Math.floor((new Date(epic.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '20px',
      overflow: 'hidden',
      marginBottom: '16px',
      border: '1px solid #eae6e1',
    }}>
      <div 
        onClick={onToggle}
        style={{ 
          padding: '28px 32px',
          cursor: 'pointer',
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <span style={{ fontSize: '28px' }}>{epic.emoji}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#2d2d2d',
                  letterSpacing: '-0.02em',
                }}>
                  {epic.name}
                </h2>
                <PhaseBadge phase={epic.phase} />
              </div>
              <p style={{
                margin: 0,
                fontSize: '15px',
                color: '#7a756e',
              }}>
                {epic.description}
                {daysUntilDeadline !== null && (
                  <span style={{ 
                    marginLeft: '8px',
                    padding: '3px 10px',
                    backgroundColor: daysUntilDeadline < 60 ? '#fff5eb' : '#f5f3f0',
                    color: daysUntilDeadline < 60 ? '#c49a5c' : '#9a958e',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}>
                    {daysUntilDeadline}d left
                  </span>
                )}
              </p>
            </div>
          </div>
          <div style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#c5c0b8',
            fontSize: '14px',
          }}>
            ▼
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end',
        }}>
          <CommitGraph history={epic.commitHistory} />
          
          <div style={{ display: 'flex', gap: '40px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 600,
                color: '#2d2d2d',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                {totalDays}
              </div>
              <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                days invested
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: 600,
                color: recentDensity > 40 ? '#4a7171' : recentDensity > 15 ? '#8a7f72' : '#c5c0b8',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}>
                {recentDensity}%
              </div>
              <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                last 2 weeks
              </div>
            </div>
            {epic.target && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ lineHeight: 1 }}>
                  <span style={{ 
                    fontSize: '36px', 
                    fontWeight: 600,
                    color: '#2d2d2d',
                    letterSpacing: '-0.03em',
                  }}>
                    {epic.target.current}
                  </span>
                  <span style={{ 
                    fontSize: '24px', 
                    fontWeight: 500,
                    color: '#c5c0b8',
                  }}>
                    /{epic.target.total}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#9a958e', marginTop: '4px' }}>
                  {epic.target.unit}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div style={{ 
          padding: '0 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#9a958e',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            paddingTop: '20px',
            borderTop: '1px solid #f0ebe4',
          }}>
            Directives
          </div>
          {epic.directives.map(directive => (
            <DirectiveRow key={directive.id} directive={directive} epicEmoji={epic.emoji} />
          ))}
          <button style={{
            padding: '14px',
            backgroundColor: 'transparent',
            border: '2px dashed #e0dbd4',
            borderRadius: '12px',
            color: '#9a958e',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: '4px',
          }}>
            + Add directive
          </button>
        </div>
      )}
    </div>
  );
}

// Suggested action
function SuggestedAction({ directive, epic, reason }) {
  const daysSince = directive.lastCheckin 
    ? Math.floor((new Date() - new Date(directive.lastCheckin)) / (1000 * 60 * 60 * 24))
    : null;
    
  return (
    <div style={{
      padding: '22px 26px',
      backgroundColor: '#fff',
      borderRadius: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid #eae6e1',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '24px' }}>{epic.emoji}</span>
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '4px',
          }}>
            <span style={{ 
              fontSize: '16px',
              fontWeight: 600,
              color: '#2d2d2d',
            }}>
              {directive.name}
            </span>
            <span style={{
              padding: '4px 10px',
              backgroundColor: reason === 'neglected' ? '#fff8f0' : '#f0f8f5',
              color: reason === 'neglected' ? '#c49a5c' : '#5c8a6e',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              {reason === 'neglected' ? 'needs love' : 'on fire'}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#9a958e' }}>
            {epic.name} · {daysSince === 0 ? 'today' : daysSince ? `${daysSince} days ago` : 'not started'}
          </div>
        </div>
      </div>
      <button style={{
        padding: '12px 24px',
        backgroundColor: '#2d2d2d',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
      }}>
        Log progress
      </button>
    </div>
  );
}

// Quick check-in modal
function CheckinModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(45, 45, 45, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
      }}>
        <h2 style={{ 
          margin: '0 0 8px', 
          fontSize: '28px', 
          fontWeight: 600,
          color: '#2d2d2d',
          letterSpacing: '-0.02em',
        }}>
          Quick check-in
        </h2>
        <p style={{
          margin: '0 0 28px',
          fontSize: '15px',
          color: '#9a958e',
        }}>
          What did you work on? Write naturally, we'll sort it out.
        </p>
        
        <textarea
          placeholder="e.g., Spent an hour tweaking the lamp hinge mechanism..."
          style={{
            width: '100%',
            height: '120px',
            padding: '18px',
            backgroundColor: '#fafaf8',
            border: '1px solid #eae6e1',
            borderRadius: '14px',
            color: '#2d2d2d',
            fontSize: '15px',
            fontFamily: 'inherit',
            resize: 'none',
          }}
        />
        
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexWrap: 'wrap',
          margin: '20px 0 28px',
        }}>
          {Object.entries(activityTypes).map(([key, type]) => (
            <button key={key} style={{
              padding: '10px 16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '10px',
              color: '#5a554e',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}>
              <span>{type.emoji}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{
            flex: 1,
            padding: '16px',
            backgroundColor: '#fafaf8',
            border: '1px solid #eae6e1',
            borderRadius: '14px',
            color: '#5a554e',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button style={{
            flex: 1,
            padding: '16px',
            backgroundColor: '#2d2d2d',
            border: 'none',
            borderRadius: '14px',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Log it
          </button>
        </div>
      </div>
    </div>
  );
}

// Main app
export default function MomentumWellness() {
  const [expandedEpic, setExpandedEpic] = useState(null);
  const [showCheckin, setShowCheckin] = useState(false);
  
  const allDirectives = sampleEpics.flatMap(epic => 
    epic.directives.map(d => ({ ...d, epic }))
  );
  
  const neglected = allDirectives
    .filter(d => {
      if (!d.lastCheckin) return true;
      const days = Math.floor((new Date() - new Date(d.lastCheckin)) / (1000 * 60 * 60 * 24));
      return (d.interval === 'daily' && days > 2) ||
             (d.interval === 'weekly' && days > 10);
    })
    .slice(0, 2);
  
  const momentum = allDirectives
    .filter(d => d.daysActive > 5)
    .sort((a, b) => b.daysActive - a.daysActive)
    .slice(0, 2);
  
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  
  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f7f5f2',
      color: '#2d2d2d',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: "DM Sans", -apple-system, sans-serif; }
        button:hover { transform: translateY(-1px); opacity: 0.95; }
        button:active { transform: translateY(0); }
        button { transition: all 0.15s ease; }
        textarea:focus, button:focus { outline: none; }
        ::placeholder { color: #b5b0a8; }
      `}</style>
      
      {/* Header */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eae6e1',
        backgroundColor: '#fff',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: '#2d2d2d',
          letterSpacing: '-0.03em',
        }}>
          momentum
        </h1>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button style={{
            padding: '12px 20px',
            backgroundColor: 'transparent',
            border: '1px solid #eae6e1',
            borderRadius: '12px',
            color: '#5a554e',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Weekly Report
          </button>
          <button 
            onClick={() => setShowCheckin(true)}
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
            + Check in
          </button>
        </div>
      </header>
      
      {/* Main */}
      <main style={{ padding: '40px', maxWidth: '960px', margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ 
            fontSize: '14px', 
            color: '#9a958e',
            marginBottom: '8px',
            fontWeight: 500,
          }}>
            Day {dayOfYear} of 2025
          </div>
          <h2 style={{
            margin: 0,
            fontSize: '40px',
            fontWeight: 600,
            color: '#2d2d2d',
            letterSpacing: '-0.03em',
          }}>
            {greeting()}, Collin
          </h2>
        </div>
        
        {/* Suggested */}
        <section style={{ marginBottom: '56px' }}>
          <h3 style={{
            margin: '0 0 20px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#9a958e',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Suggested next
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {neglected.map(d => (
              <SuggestedAction key={d.id} directive={d} epic={d.epic} reason="neglected" />
            ))}
            {momentum.slice(0, 4 - neglected.length).map(d => (
              <SuggestedAction key={d.id} directive={d} epic={d.epic} reason="momentum" />
            ))}
          </div>
        </section>
        
        {/* Epics */}
        <section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 700,
              color: '#9a958e',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Your Epics
            </h3>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#fafaf8',
              border: '1px solid #eae6e1',
              borderRadius: '10px',
              color: '#5a554e',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              + New Epic
            </button>
          </div>
          
          {sampleEpics.map(epic => (
            <EpicCard
              key={epic.id}
              epic={epic}
              isExpanded={expandedEpic === epic.id}
              onToggle={() => setExpandedEpic(expandedEpic === epic.id ? null : epic.id)}
            />
          ))}
        </section>
      </main>
      
      <CheckinModal isOpen={showCheckin} onClose={() => setShowCheckin(false)} />
    </div>
  );
}

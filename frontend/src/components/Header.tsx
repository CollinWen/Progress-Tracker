import type { User } from '../lib/types';

interface HeaderProps {
  user: User | null;
  onCheckIn: () => void;
  onSignOut?: () => void;
  onCreateEpic?: () => void;
}

export function Header({ user, onCheckIn, onSignOut, onCreateEpic }: HeaderProps) {
  return (
    <header
      style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #eae6e1',
        backgroundColor: '#fff',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: '#2d2d2d',
          letterSpacing: '-0.03em',
        }}
      >
        momentum
      </h1>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {user && (
          <>
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              background: '#fafaf8',
              borderRadius: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4a7171 0%, #5c8a6e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#2d2d2d'
              }}>
                {user.name}
              </span>
            </div>

            {/* Create Epic Button */}
            {onCreateEpic && (
              <button
                onClick={onCreateEpic}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid #eae6e1',
                  borderRadius: '12px',
                  color: '#5a554e',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4a7171';
                  e.currentTarget.style.color = '#4a7171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#eae6e1';
                  e.currentTarget.style.color = '#5a554e';
                }}
              >
                + New Epic
              </button>
            )}

            {/* Check In Button */}
            <button
              onClick={onCheckIn}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2d2d2d',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2d2d2d';
              }}
            >
              + Check in
            </button>

            {/* Sign Out Button */}
            {onSignOut && (
              <button
                onClick={onSignOut}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#9a958e',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#c53030';
                  e.currentTarget.style.backgroundColor = '#fff5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9a958e';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Sign out
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

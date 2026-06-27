import { useNavigate, useLocation } from 'react-router-dom';
import type { User, MomentumData } from '../lib/types';
import { ProfileMenu } from './ProfileMenu';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  user: User | null;
  data: MomentumData | null;
  onCheckIn: () => void;
  onSignOut: () => void;
  onCreateEpic?: () => void;
}

export function Header({ user, data, onCheckIn, onSignOut, onCreateEpic }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();

  return (
    <header style={{
      padding: '0 40px',
      height: '52px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.surface,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left — wordmark + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <div
          className="font-serif"
          onClick={() => navigate('/')}
          style={{
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: colors.text,
            cursor: 'pointer',
            paddingRight: '28px',
            borderRight: `1px solid ${colors.borderLight}`,
            marginRight: '4px',
            lineHeight: '52px',
          }}
        >
          momentum
        </div>

        {user && (
          <nav style={{ display: 'flex', gap: '0' }}>
            {[
              { label: 'Dashboard', path: '/' },
              { label: 'All Epics', path: '/epics' },
            ].map(({ label, path }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${colors.text}` : '2px solid transparent',
                    padding: '0 16px',
                    height: '52px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: isActive ? colors.text : colors.textTertiary,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right — actions + profile */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onCreateEpic && (
            <button
              onClick={onCreateEpic}
              style={{
                padding: '6px 14px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 0,
                color: colors.textSecondary,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              + Epic
            </button>
          )}
          <button
            onClick={onCheckIn}
            style={{
              padding: '6px 16px',
              backgroundColor: colors.text,
              border: `1px solid ${colors.text}`,
              borderRadius: 0,
              color: colors.surface,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            + Log
          </button>
          <ProfileMenu user={user} data={data} onSignOut={onSignOut} />
        </div>
      )}
    </header>
  );
}

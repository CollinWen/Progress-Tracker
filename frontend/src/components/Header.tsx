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
      height: '56px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.surface,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <img
          src="/logo.svg"
          alt="momentum"
          style={{ height: '20px', display: 'block', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />
        {user && (
          <nav style={{ display: 'flex', gap: '0' }}>
            {[{ label: 'Dashboard', path: '/' }, { label: 'All Epics', path: '/epics' }].map(({ label, path }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${colors.text}` : '2px solid transparent',
                    padding: '4px 14px',
                    height: '56px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? colors.text : colors.textTertiary,
                    cursor: 'pointer',
                    letterSpacing: '0.01em',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onCreateEpic && (
            <button
              onClick={onCreateEpic}
              style={{ padding: '7px 14px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '5px', color: colors.textSecondary, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              + Epic
            </button>
          )}
          <button
            onClick={onCheckIn}
            style={{ padding: '7px 16px', backgroundColor: colors.text, border: 'none', borderRadius: '5px', color: colors.surface, fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.01em' }}
          >
            + Log
          </button>
          <ProfileMenu user={user} data={data} onSignOut={onSignOut} />
        </div>
      )}
    </header>
  );
}

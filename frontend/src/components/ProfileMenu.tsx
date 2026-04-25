import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Download, LogOut } from 'lucide-react';
import type { User, MomentumData } from '../lib/types';
import { countActiveDaysThisMonth } from '../lib/computeDerivedData';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileMenuProps {
  user: User;
  data: MomentumData | null;
  onSignOut: () => void;
}

function exportDataAsJson(data: MomentumData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `momentum-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfileMenu({ user, data, onSignOut }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme, colors } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const activeDays = data ? countActiveDaysThisMonth(data.logs) : 0;
  const totalLogs = data?.logs.length ?? 0;
  const totalEpics = data?.epics.length ?? 0;
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Avatar trigger */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4a7171 0%, #5c8a6e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          border: isOpen ? `2px solid ${colors.text}` : '2px solid transparent',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'border-color 0.15s ease',
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '240px',
          backgroundColor: colors.surface,
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          boxShadow: theme === 'light' ? '0 8px 32px rgba(0,0,0,0.12)' : '0 8px 32px rgba(0,0,0,0.50)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Profile section */}
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <div style={{ fontWeight: 600, fontSize: '15px', color: colors.text, marginBottom: '2px' }}>{user.name}</div>
            {user.email && <div style={{ fontSize: '12px', color: colors.textTertiary, marginBottom: '12px' }}>{user.email}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { value: totalEpics, label: 'Epics' },
                { value: totalLogs, label: 'Logs' },
                { value: activeDays, label: 'Days / mo' },
              ].map(({ value, label }) => (
                <div key={label} style={{ textAlign: 'center', padding: '8px 4px', backgroundColor: colors.hover, borderRadius: '5px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '10px', color: colors.textTertiary, marginTop: '3px' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: colors.inactive, marginTop: '10px' }}>Member since {memberSince}</div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '8px' }}>
            <MenuButton
              onClick={toggleTheme}
              icon={theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              label={theme === 'light' ? 'Dark mode' : 'Light mode'}
              sublabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            />
            <MenuButton
              onClick={() => { setIsOpen(false); if (data) exportDataAsJson(data); }}
              icon={<Download size={14} />}
              label="Export data"
              sublabel="Download your logs as JSON"
            />
            <MenuButton
              onClick={() => { setIsOpen(false); onSignOut(); }}
              icon={<LogOut size={14} />}
              label="Sign out"
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  danger?: boolean;
}

function MenuButton({ onClick, icon, label, sublabel, danger }: MenuButtonProps) {
  const { colors } = useTheme();

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        textAlign: 'left',
        color: danger ? colors.danger : colors.text,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = danger ? colors.dangerBg : colors.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: '20px', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{label}</div>
        {sublabel && <div style={{ fontSize: '11px', color: colors.textTertiary, marginTop: '1px' }}>{sublabel}</div>}
      </div>
    </button>
  );
}

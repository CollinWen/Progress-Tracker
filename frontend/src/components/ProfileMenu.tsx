import { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Download, LogOut, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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
          width: '28px',
          height: '28px',
          borderRadius: 0,
          backgroundColor: isOpen ? colors.text : colors.hover,
          border: `1px solid ${isOpen ? colors.text : colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? colors.surface : colors.textSecondary,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background-color 0.12s ease, color 0.12s ease',
        }}
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '248px',
          backgroundColor: colors.surface,
          borderRadius: 0,
          border: `1px solid ${colors.border}`,
          boxShadow: theme === 'light' ? '0 8px 40px rgba(0,0,0,0.12)' : '0 8px 40px rgba(0,0,0,0.55)',
          zIndex: 200,
          overflow: 'hidden',
        }}>

          {/* ── Profile header ── */}
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${colors.borderLight}` }}>
            {/* Editorial label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '10px', height: '1px', backgroundColor: colors.text }} />
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: colors.textTertiary, textTransform: 'uppercase' }}>
                Account
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
            </div>

            <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text, marginBottom: '2px' }}>{user.name}</div>
            {user.email && (
              <div style={{ fontSize: '11px', color: colors.textTertiary, marginBottom: '14px' }}>{user.email}</div>
            )}

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { value: totalEpics, label: 'Epics' },
                { value: totalLogs, label: 'Logs' },
                { value: activeDays, label: 'Days / mo' },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  backgroundColor: colors.hover,
                  border: `1px solid ${colors.borderLight}`,
                  borderRadius: 0,
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: colors.text, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: colors.textTertiary, marginTop: '3px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '10px', color: colors.inactive, marginTop: '10px', letterSpacing: '0.04em' }}>
              Member since {memberSince}
            </div>
          </div>

          {/* ── Menu items ── */}
          <div style={{ padding: '6px' }}>
            <MenuButton
              onClick={toggleTheme}
              icon={theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
              label={theme === 'light' ? 'Dark mode' : 'Light mode'}
              sublabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            />
            <MenuButton
              onClick={() => { setIsOpen(false); if (data) exportDataAsJson(data); }}
              icon={<Download size={13} />}
              label="Export data"
              sublabel="Download your logs as JSON"
            />
            <MenuButton
              onClick={() => { setIsOpen(false); navigate('/keys'); }}
              icon={<KeyRound size={13} />}
              label="API keys"
              sublabel="Manage agent access keys"
            />
            <div style={{ height: '1px', backgroundColor: colors.borderLight, margin: '4px 6px' }} />
            <MenuButton
              onClick={() => { setIsOpen(false); onSignOut(); }}
              icon={<LogOut size={13} />}
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
        padding: '9px 10px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        textAlign: 'left',
        color: danger ? colors.danger : colors.text,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = danger ? colors.dangerBg : colors.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center', width: '18px', flexShrink: 0, color: danger ? colors.danger : colors.textTertiary }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.01em' }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: '10px', color: colors.textTertiary, marginTop: '1px' }}>{sublabel}</div>
        )}
      </div>
    </button>
  );
}

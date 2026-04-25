import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface MenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  items: MenuItem[];
}

export function DropdownMenu({ items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { colors, theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          padding: '5px 8px',
          border: `1px solid ${colors.border}`,
          borderRadius: '5px',
          backgroundColor: colors.surface,
          color: colors.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="More options"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          boxShadow: theme === 'light' ? '0 4px 16px rgba(0,0,0,0.10)' : '0 4px 16px rgba(0,0,0,0.40)',
          minWidth: '160px',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {items.map((item, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); item.onClick(); setIsOpen(false); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: 'none',
                backgroundColor: 'transparent',
                color: item.variant === 'danger' ? colors.danger : colors.text,
                cursor: 'pointer',
                textAlign: 'left',
                borderTop: index > 0 ? `1px solid ${colors.borderLight}` : 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = item.variant === 'danger' ? colors.dangerBg : colors.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

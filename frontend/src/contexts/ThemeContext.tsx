import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  surfaceBorder: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  hover: string;
  accent: string;
  accentLight: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  warning: string;
  warningBg: string;
  tagBg: string;
  dashed: string;
  inactive: string;
  graphEmpty: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background:    '#f1eeea',
  surface:       '#ffffff',
  surfaceBorder: '#d4d0ca',
  text:          '#161616',
  textSecondary: '#575250',
  textTertiary:  '#7a7570',
  border:        '#d4d0ca',
  borderLight:   '#e4e0da',
  hover:         '#eae7e2',
  accent:        '#1e5252',
  accentLight:   '#e6f0f0',
  danger:        '#b52a2a',
  dangerBg:      '#fef2f2',
  dangerBorder:  '#f5c5c5',
  warning:       '#a07840',
  warningBg:     '#fdf3e7',
  tagBg:         '#e4e0da',
  dashed:        '#ccc8c2',
  inactive:      '#aba8a2',
  graphEmpty:    '#e4e0da',
};

const darkColors: ThemeColors = {
  background:    '#0e0e0e',
  surface:       '#181818',
  surfaceBorder: '#282828',
  text:          '#f0eeea',
  textSecondary: '#a8a5a0',
  textTertiary:  '#727070',
  border:        '#282828',
  borderLight:   '#202020',
  hover:         '#222222',
  accent:        '#5a9090',
  accentLight:   '#152828',
  danger:        '#e05050',
  dangerBg:      '#280e0e',
  dangerBorder:  '#4a2020',
  warning:       '#c49a5c',
  warningBg:     '#251a08',
  tagBg:         '#202020',
  dashed:        '#303030',
  inactive:      '#484644',
  graphEmpty:    '#202020',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('momentum-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('momentum-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

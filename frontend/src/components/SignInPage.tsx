import { useState } from 'react';
import { Loader2, BarChart2, Zap, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SignInPageProps {
  onSignIn: () => Promise<void>;
  error?: string;
}

export function SignInPage({ onSignIn, error }: SignInPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);
  const { colors } = useTheme();

  const handleSignIn = async () => {
    setIsLoading(true);
    setLocalError(undefined);
    try {
      await onSignIn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sign-in failed');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: '10px',
        padding: '48px 44px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: `1px solid ${colors.border}`,
        textAlign: 'center',
      }}>
        {/* Brand */}
        <div className="font-serif" style={{ fontSize: '44px', fontWeight: 600, letterSpacing: '-0.03em', color: colors.text, marginBottom: '14px' }}>
          momentum
        </div>

        <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: '1.6', marginBottom: '40px' }}>
          Track progress toward your goals through<br />
          incremental daily check-ins
        </p>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px 28px',
            backgroundColor: isLoading ? colors.inactive : colors.text,
            color: colors.surface,
            border: 'none',
            borderRadius: '5px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '14px',
            letterSpacing: '0.01em',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {localError && (
          <div style={{ padding: '10px 14px', backgroundColor: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: '5px', color: colors.danger, fontSize: '13px', marginBottom: '14px' }}>
            {localError}
          </div>
        )}

        <p style={{ fontSize: '12px', color: colors.textTertiary, lineHeight: '1.5' }}>
          Your data is stored securely in your Google Drive.<br />
          We never access your other files.
        </p>

        {/* Features list */}
        <div style={{ marginTop: '40px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: `1px solid ${colors.border}`, paddingTop: '28px' }}>
          {[
            { icon: <BarChart2 size={18} color={colors.accent} />, title: 'Visual Progress Tracking', desc: 'GitHub-style commit graphs show your momentum' },
            { icon: <Zap size={18} color={colors.accent} />, title: 'Low-Friction Check-ins', desc: 'Quick daily logs with optional details' },
            { icon: <ShieldCheck size={18} color={colors.accent} />, title: 'Your Data, Your Control', desc: 'All data stored in your Google Drive, export anytime' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '2px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: colors.textSecondary, lineHeight: '1.4' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

interface SignInPageProps {
  onSignIn: () => Promise<void>;
  error?: string;
}

export function SignInPage({ onSignIn, error }: SignInPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);

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
      background: 'linear-gradient(135deg, #f7f5f2 0%, #faf9f7 100%)',
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '56px 48px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        textAlign: 'center'
      }}>
        {/* Logo/Brand */}
        <div style={{
          fontSize: '48px',
          fontWeight: '600',
          letterSpacing: '-0.03em',
          color: '#2d2d2d',
          marginBottom: '16px'
        }}>
          momentum
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: '17px',
          color: '#7a756e',
          lineHeight: '1.6',
          marginBottom: '48px'
        }}>
          Track progress toward your goals through<br />
          incremental daily check-ins
        </p>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '16px 32px',
            background: isLoading ? '#9a958e' : '#4a7171',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {isLoading ? (
            <>
              <svg style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="10" />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
              </svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {localError && (
          <div style={{
            padding: '12px 16px',
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            color: '#c53030',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {localError}
          </div>
        )}

        {/* Privacy Note */}
        <p style={{
          fontSize: '13px',
          color: '#9a958e',
          lineHeight: '1.5'
        }}>
          Your data is stored securely in your Google Drive.<br />
          We never access your other files.
        </p>

        {/* Features List */}
        <div style={{
          marginTop: '48px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>📊</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d2d2d', marginBottom: '2px' }}>
                Visual Progress Tracking
              </div>
              <div style={{ fontSize: '13px', color: '#7a756e', lineHeight: '1.4' }}>
                GitHub-style commit graphs show your momentum
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>⚡</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d2d2d', marginBottom: '2px' }}>
                Low-Friction Check-ins
              </div>
              <div style={{ fontSize: '13px', color: '#7a756e', lineHeight: '1.4' }}>
                Quick daily logs with optional details
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>🔒</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d2d2d', marginBottom: '2px' }}>
                Your Data, Your Control
              </div>
              <div style={{ fontSize: '13px', color: '#7a756e', lineHeight: '1.4' }}>
                All data stored in your Google Drive, export anytime
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

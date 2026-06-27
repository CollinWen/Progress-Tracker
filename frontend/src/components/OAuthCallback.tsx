import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/**
 * OAuth Callback component
 * Handles the redirect from Google OAuth and exchanges the code for a token.
 */
export function OAuthCallback() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Extract authorization code or error from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');

      // If this is a popup, send message to parent
      if (window.opener) {
        if (code) {
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_CODE',
              code: code,
            },
            window.location.origin
          );
        } else if (errorParam) {
          window.opener.postMessage(
            {
              type: 'GOOGLE_AUTH_ERROR',
              error: errorParam,
            },
            window.location.origin
          );
        }
        window.close();
        return;
      }

      // Handle direct redirect (not popup)
      if (errorParam) {
        setError(errorParam);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        // Exchange code for token via backend
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        console.log('Exchanging code for token...', { apiUrl, codeLength: code.length });

        const response = await fetch(`${apiUrl}/auth/google/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        console.log('Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText || 'Authentication failed' };
          }
          throw new Error(errorData.detail || `Authentication failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully authenticated, received token');

        // Save to sessionStorage
        sessionStorage.setItem('momentum_token', data.access_token);
        sessionStorage.setItem('momentum_file_id', data.file_id);
        sessionStorage.setItem('momentum_user', JSON.stringify({
          name: data.user.name,
          createdAt: new Date().toISOString(),
        }));

        // Redirect to home
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: colors.text,
      backgroundColor: colors.background,
    }}>
      <div style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.danger, marginBottom: '12px' }}>Authentication failed</div>
            <div style={{ fontSize: '13px', color: colors.textTertiary, marginBottom: '8px' }}>{error}</div>
            <div style={{ fontSize: '13px', color: colors.inactive }}>Redirecting to home…</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.text, marginBottom: '12px' }}>Completing sign-in</div>
            <div style={{ fontSize: '13px', color: colors.inactive }}>Please wait…</div>
          </>
        )}
      </div>
    </div>
  );
}

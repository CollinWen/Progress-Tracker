import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SignInPageProps {
  onSignIn: () => Promise<void>;
  error?: string;
}

// The left panel is intentionally always-dark (editorial brand identity, not theme-dependent).
const BRAND_INK = '#0f0f0f';
const BRAND_PAPER = '#e8e4de';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"/>
    </svg>
  );
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
      fontFamily: 'inherit',
    }}>

      {/* ── Left panel — dark editorial ── */}
      <div style={{
        width: '42%',
        minWidth: '340px',
        backgroundColor: BRAND_INK,
        color: BRAND_PAPER,
        padding: '48px 52px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at 20% 80%, rgba(30,82,82,0.12) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        {/* Top section */}
        <div style={{ position: 'relative' }}>
          {/* Vol. label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '64px',
          }}>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: `${BRAND_PAPER}66`,
              textTransform: 'uppercase',
            }}>
              Vol. 04
            </span>
            <div style={{ width: '24px', height: '1px', backgroundColor: `${BRAND_PAPER}33` }} />
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: `${BRAND_PAPER}66`,
              textTransform: 'uppercase',
            }}>
              A field journal for ambition
            </span>
          </div>

          {/* Wordmark */}
          <div className="font-serif" style={{
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: `${BRAND_PAPER}80`,
            marginBottom: '28px',
          }}>
            momentum
          </div>

          {/* Main serif headline */}
          <h1 className="font-serif" style={{
            margin: 0,
            fontSize: 'clamp(32px, 3.2vw, 44px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: BRAND_PAPER,
          }}>
            The work that
            <br />
            matters compounds
            <br />
            <span style={{ color: `${BRAND_PAPER}80` }}>quietly.</span>
          </h1>
        </div>

        {/* Bottom — numbered steps */}
        <div style={{ position: 'relative', borderTop: `1px solid ${BRAND_PAPER}1a`, paddingTop: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { n: '01', label: 'Track epics — your long-horizon goals' },
              { n: '02', label: 'Log directives daily, without friction' },
              { n: '03', label: 'Watch your compound progress unfold' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: `${BRAND_PAPER}4d`,
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {step.n}
                </span>
                <div style={{ width: '16px', height: '1px', backgroundColor: `${BRAND_PAPER}26`, flexShrink: 0, marginBottom: '2px' }} />
                <span style={{
                  fontSize: '12px',
                  color: `${BRAND_PAPER}8c`,
                  lineHeight: 1.4,
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — sign-in ── */}
      <div style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: '48px 64px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}>

        {/* Top corner mark */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: colors.textTertiary,
            textTransform: 'uppercase',
          }}>
            Sign In — 01
          </span>
        </div>

        {/* Center content */}
        <div style={{ maxWidth: '400px' }}>
          {/* Tick-rule section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ width: '14px', height: '1px', backgroundColor: colors.text }} />
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: colors.textTertiary,
              textTransform: 'uppercase',
            }}>
              Welcome
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
          </div>

          {/* Headline */}
          <h2 className="font-serif" style={{
            margin: '0 0 20px',
            fontSize: 'clamp(38px, 4vw, 52px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: colors.text,
          }}>
            Begin the<br />
            field journal.
          </h2>

          {/* Body */}
          <p style={{
            margin: '0 0 36px',
            fontSize: '14px',
            color: colors.textSecondary,
            lineHeight: 1.7,
            maxWidth: '340px',
          }}>
            A private momentum tracker for the goals that take months, not minutes.
            Everything lives in your own Google Drive.
          </p>

          {/* Sign-in button — full width, square, uppercase */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: colors.text,
              color: colors.surface,
              border: `1px solid ${colors.text}`,
              borderRadius: 0,
              fontSize: '11px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.12s ease',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isLoading ? <Loader2 size={14} className="spin" /> : <GoogleIcon />}
              <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
            </span>
            {!isLoading && <span>→</span>}
          </button>

          {localError && (
            <div style={{
              marginTop: '14px',
              padding: '10px 14px',
              backgroundColor: colors.dangerBg,
              border: `1px solid ${colors.dangerBorder}`,
              borderRadius: 0,
              color: colors.danger,
              fontSize: '12px',
            }}>
              {localError}
            </div>
          )}

          {/* Roman numeral features */}
          <div style={{ marginTop: '48px', borderTop: `1px solid ${colors.borderLight}`, paddingTop: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { num: 'I.', title: 'Visual progress', desc: 'Commit graphs that turn daily effort into a visible record.' },
                { num: 'II.', title: 'Low friction', desc: 'Log a session in under ten seconds. No dashboards to configure.' },
                { num: 'III.', title: 'Your data', desc: 'Stored in your Google Drive. No vendor lock-in. Export anytime.' },
              ].map(feat => (
                <div key={feat.num} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: colors.textTertiary,
                    minWidth: '24px',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>
                    {feat.num}
                  </span>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: colors.text }}>
                      {feat.title}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textTertiary, marginLeft: '6px' }}>
                      — {feat.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom corner mark */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: colors.textTertiary,
            textTransform: 'uppercase',
          }}>
            Private — Your Drive
          </span>
          <span style={{
            fontSize: '9px',
            color: colors.inactive,
            letterSpacing: '0.06em',
          }}>
            Free · No credit card required
          </span>
        </div>
      </div>
    </div>
  );
}

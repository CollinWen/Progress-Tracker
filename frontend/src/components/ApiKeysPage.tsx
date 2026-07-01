import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Check, Trash2, Key } from 'lucide-react';
import type { ApiKey, CreateApiKeyResponse } from '../lib/types';
import { getDataService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

export function ApiKeysPage() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New key creation
  const [showForm, setShowForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Per-key revoke state
  const [revoking, setRevoking] = useState<string | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  const service = getDataService();

  useEffect(() => {
    service
      .listApiKeys()
      .then(setKeys)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load keys'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showForm) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showForm]);

  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await service.createApiKey(name);
      setCreatedKey(result);
      setKeys((prev) => [
        { keyId: result.keyId, name: result.name, createdAt: result.createdAt, lastUsedAt: null },
        ...prev,
      ]);
      setNewKeyName('');
      setShowForm(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setRevoking(keyId);
    try {
      await service.revokeApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.keyId !== keyId));
      if (createdKey?.keyId === keyId) setCreatedKey(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      {/* Header bar */}
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 40px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px', backgroundColor: 'transparent', color: colors.textSecondary,
              border: `1px solid ${colors.border}`, borderRadius: 0, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 40px 64px' }}>
        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1
              className="font-serif"
              style={{ margin: '0 0 6px', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.025em', color: colors.text }}
            >
              API keys
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6, maxWidth: '440px' }}>
              Generate a key to give an agent access to your Momentum data via the MCP server.
              Pass it as <code style={{ fontSize: '11px', color: colors.text }}>Authorization: Bearer &lt;key&gt;</code>.
              Keys are never shown again after creation.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setCreatedKey(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', backgroundColor: colors.text, color: colors.surface,
              border: 'none', borderRadius: 0, fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Plus size={13} /> New key
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{
            marginBottom: '24px', padding: '20px',
            border: `1px solid ${colors.border}`, backgroundColor: colors.surface,
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: '12px' }}>
              New API key
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowForm(false); }}
                placeholder="Key name (e.g. Claude agent, local dev)"
                style={{
                  flex: 1, padding: '8px 12px', fontSize: '13px',
                  backgroundColor: colors.background, color: colors.text,
                  border: `1px solid ${colors.border}`, borderRadius: 0, outline: 'none',
                }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newKeyName.trim()}
                style={{
                  padding: '8px 16px', backgroundColor: colors.text, color: colors.surface,
                  border: 'none', borderRadius: 0, fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: creating || !newKeyName.trim() ? 'not-allowed' : 'pointer',
                  opacity: creating || !newKeyName.trim() ? 0.5 : 1,
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewKeyName(''); setCreateError(null); }}
                style={{
                  padding: '8px 12px', backgroundColor: 'transparent', color: colors.textSecondary,
                  border: `1px solid ${colors.border}`, borderRadius: 0, fontSize: '11px',
                  fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            {createError && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: colors.danger }}>{createError}</div>
            )}
          </div>
        )}

        {/* Newly created key reveal — shown once */}
        {createdKey && (
          <div style={{
            marginBottom: '24px', padding: '20px',
            border: `1px solid ${colors.text}`, backgroundColor: colors.surface,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Key size={13} color={colors.text} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.text }}>
                Copy your key now — it won't be shown again
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <code style={{
                flex: 1, padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace',
                backgroundColor: colors.hover, color: colors.text,
                border: `1px solid ${colors.borderLight}`, borderRadius: 0,
                wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {createdKey.key}
              </code>
              <button
                onClick={() => handleCopy(createdKey.key)}
                title="Copy to clipboard"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '36px', height: '36px', flexShrink: 0,
                  backgroundColor: copied ? colors.text : colors.hover,
                  color: copied ? colors.surface : colors.textSecondary,
                  border: `1px solid ${colors.border}`, borderRadius: 0, cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div style={{ marginBottom: '16px', fontSize: '13px', color: colors.danger }}>{error}</div>}

        {/* Key list */}
        {loading ? (
          <div style={{ fontSize: '13px', color: colors.textTertiary }}>Loading…</div>
        ) : keys.length === 0 ? (
          <div style={{
            padding: '48px 24px', textAlign: 'center',
            border: `1px dashed ${colors.border}`, backgroundColor: colors.surface,
          }}>
            <Key size={24} color={colors.inactive} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: 500 }}>No API keys yet</div>
            <div style={{ fontSize: '12px', color: colors.textTertiary, marginTop: '4px' }}>
              Create one to let an agent connect to your MCP server.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: `1px solid ${colors.border}` }}>
            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 140px 140px 36px',
              padding: '8px 16px', backgroundColor: colors.hover,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              {['Name', 'Created', 'Last used', ''].map((h) => (
                <span key={h} style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary }}>
                  {h}
                </span>
              ))}
            </div>

            {keys.map((key) => (
              <div
                key={key.keyId}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 140px 36px',
                  alignItems: 'center', padding: '12px 16px',
                  backgroundColor: colors.surface, borderBottom: `1px solid ${colors.borderLight}`,
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{key.name}</div>
                  <div style={{ fontSize: '10px', color: colors.textTertiary, marginTop: '2px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {key.keyId.slice(0, 8)}…
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: colors.textSecondary }}>{formatDate(key.createdAt)}</div>
                <div style={{ fontSize: '12px', color: key.lastUsedAt ? colors.textSecondary : colors.inactive }}>
                  {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                </div>
                <button
                  onClick={() => handleRevoke(key.keyId)}
                  disabled={revoking === key.keyId}
                  title="Revoke key"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px',
                    backgroundColor: 'transparent', color: colors.textTertiary,
                    border: `1px solid transparent`, borderRadius: 0,
                    cursor: revoking === key.keyId ? 'not-allowed' : 'pointer',
                    opacity: revoking === key.keyId ? 0.4 : 1,
                    transition: 'color 0.12s ease, border-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colors.danger;
                    e.currentTarget.style.borderColor = colors.danger;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colors.textTertiary;
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Usage note */}
        {keys.length > 0 && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: colors.hover, border: `1px solid ${colors.borderLight}` }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.textTertiary, marginBottom: '6px' }}>
              Usage
            </div>
            <code style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: 1.7, display: 'block' }}>
              Authorization: Bearer mom_…<br />
              MCP endpoint: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}/mcp
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

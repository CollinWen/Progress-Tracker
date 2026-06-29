import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, ShieldAlert, GitBranch } from 'lucide-react';
import type { SkillCatalogItem } from '../lib/types';
import { getDataService } from '../services';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Catalog of agent skills — what the orchestrator can do, what's available now,
 * and which skills require review or surface new directives.
 */
export function SkillsCatalog() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDataService()
      .listSkills()
      .then(setSkills)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load skills'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background }}>
      <div style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '16px 40px' }}>
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

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 40px 64px' }}>
        <h1 className="font-serif" style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: 600, letterSpacing: '-0.025em', color: colors.text }}>
          Agent skills
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
          What your agent can do. Attach a skill to a directive (set its <code>agent.skill</code>) and the
          orchestrator will run it — on demand or on a schedule.
        </p>

        {loading && <div style={{ color: colors.textTertiary, fontSize: '14px' }}>Loading…</div>}
        {error && <div style={{ color: colors.danger, fontSize: '14px' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {skills.map((skill) => (
            <div
              key={skill.name}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                padding: '18px 20px',
                opacity: skill.available ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: colors.text }}>{skill.label}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: skill.available ? colors.accent : colors.textTertiary,
                }}>
                  {skill.available ? <><Check size={11} /> Available</> : <><Clock size={11} /> Soon</>}
                </span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: colors.textSecondary, lineHeight: 1.5 }}>
                {skill.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {skill.requiresReview && (
                  <Tag icon={<ShieldAlert size={10} />} label="Needs review" colors={colors} />
                )}
                {skill.createsDirectives && (
                  <Tag icon={<GitBranch size={10} />} label="Creates todos" colors={colors} />
                )}
                {skill.requiredMcps.map((mcp) => (
                  <Tag key={mcp} label={mcp} colors={colors} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tag({ icon, label, colors }: { icon?: React.ReactNode; label: string; colors: any }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 7px', border: `1px solid ${colors.border}`, borderRadius: 0,
      fontSize: '10px', color: colors.textTertiary, fontWeight: 500,
    }}>
      {icon}{label}
    </span>
  );
}

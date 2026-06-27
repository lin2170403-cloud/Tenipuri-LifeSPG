// 絕招狀態（只讀）：已學 ✓ / 可學（提示到分配中心）/ 未達門檻（顯示缺什麼）
import { skillStatus } from '../lib/engine.js';
import { ATTR_LABELS_SHORT, DIFFICULTY } from '../lib/constants.js';
import { useGame } from '../lib/store.jsx';

export default function SkillList({ char, charState }) {
  const { template, save } = useGame();
  const skills = template.skills
    .filter((s) => s.charId === char.id)
    .sort((a, b) => (DIFFICULTY[a.difficulty]?.rank || 0) - (DIFFICULTY[b.difficulty]?.rank || 0) || a.requiredStage - b.requiredStage);
  const sp = save.currency.skillPoints;

  if (!skills.length) return <div className="empty">このキャラの必殺技データがありません</div>;

  return (
    <div className="skill-grid">
      {skills.map((skill) => {
        const st = skillStatus(skill, charState, sp);
        const diff = DIFFICULTY[skill.difficulty] || { color: '#888' };
        return (
          <div key={skill.id} className={`skill ${st.state}`}>
            <div className="s-main">
              <div className="s-name">{skill.name}</div>
              <div className="s-tags">
                <span className="tag diff" style={{ background: diff.color }}>{skill.difficulty}</span>
                <span className="tag">段階 ≥{skill.requiredStage}</span>
                <span className="tag cost">{skill.cost} SP</span>
              </div>
              <div className="s-reqs">
                {skill.attrRequirements.map((req) => {
                  const have = Math.round((charState.attrs[req.attr] || 0) * 10) / 10;
                  const ok = have >= req.min;
                  return (
                    <span key={req.attr} className={ok ? 'ok' : 'no'}>
                      {ATTR_LABELS_SHORT[req.attr]} {have}/{req.min}{ok ? '✓' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="s-side">
              {st.state === 'learned' && <span className="s-check">✓</span>}
              {st.state === 'available' && <span className="s-state" style={{ color: 'var(--accent-deep)', fontWeight: 700 }}>習得可<br />→配分へ</span>}
              {st.state === 'locked' && (
                <span className="s-state">
                  {charState.level < skill.requiredStage ? `段階${skill.requiredStage}必要`
                    : sp < skill.cost ? 'SP不足' : '条件未達'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

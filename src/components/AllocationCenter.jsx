// 分配中心（設定頁內）：統一賦分。
// · 屬性賦分：可同時對 N 個角色分配積分（招牌 ×1.5），草稿可一鍵還原，保存才扣分。
// · 技能學習：用技能點學絕招，同樣草稿制。當日點數不必用完。
import { useState, useMemo } from 'react';
import { ATTR_GROUP_LIST, ATTR_LABELS, ATTR_KEYS, DIFFICULTY, TEAMS } from '../lib/constants.js';
import { previewGrids, applyAllocation, skillStatus } from '../lib/engine.js';
import { useGame } from '../lib/store.jsx';

export default function AllocationCenter() {
  const { template, save, commitAllocation } = useGame();
  const [mode, setMode] = useState('attr');
  const [attrDraft, setAttrDraft] = useState({});   // {charId:{attr:pts}}
  const [skillDraft, setSkillDraft] = useState({});  // {charId:[skillId]}
  const [sel, setSel] = useState(template?.characters?.[0]?.id || null);
  const [busy, setBusy] = useState(false);

  const chars = template?.characters || [];
  const selChar = chars.find((c) => c.id === sel);

  // 草稿用量
  const pointsUsed = useMemo(() =>
    Object.values(attrDraft).reduce((a, m) => a + Object.values(m).reduce((x, y) => x + (Number(y) || 0), 0), 0),
  [attrDraft]);
  const skillUsed = useMemo(() => {
    let s = 0;
    for (const [cid, ids] of Object.entries(skillDraft)) {
      for (const id of ids) {
        const sk = template.skills.find((k) => k.id === id);
        if (sk && !save.characters[cid]?.learnedSkills.includes(id)) s += sk.cost;
      }
    }
    return s;
  }, [skillDraft, template, save]);

  const pointsLeft = Math.round((save.currency.points - pointsUsed) * 10) / 10;
  const skillLeft = Math.round((save.currency.skillPoints - skillUsed) * 10) / 10;
  const hasDraft = pointsUsed > 0 || skillUsed > 0;

  const setAttr = (charId, attr, v) => {
    const n = v === '' ? 0 : Math.max(0, Math.floor(Number(v) || 0));
    setAttrDraft((d) => ({ ...d, [charId]: { ...(d[charId] || {}), [attr]: n } }));
  };
  const toggleSkill = (charId, id) => {
    setSkillDraft((d) => {
      const cur = d[charId] || [];
      return { ...d, [charId]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  };

  const resetAll = () => { setAttrDraft({}); setSkillDraft({}); };

  const save_ = async () => {
    setBusy(true);
    const res = await commitAllocation(attrDraft, skillDraft);
    setBusy(false);
    if (res) resetAll();
  };

  // 該角色考慮草稿後的「有效屬性」（用於技能門檻即時判定）
  const effAttrs = (charId) => {
    const cs = save.characters[charId];
    const ct = chars.find((c) => c.id === charId);
    const d = attrDraft[charId];
    if (!cs || !ct || !d) return cs?.attrs || {};
    return applyAllocation(cs, ct, d).attrs;
  };

  const charDraftCount = (c) => {
    if (mode === 'attr') {
      const m = attrDraft[c.id] || {};
      const sum = Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
      return sum > 0 ? sum : 0;
    }
    return (skillDraft[c.id] || []).length;
  };

  if (!template) return <div className="empty">キャラデータ未読み込み</div>;

  return (
    <div>
      {/* 残高バー + リセット */}
      <div className="alloc-bar">
        <div className="nums">
          {mode === 'attr'
            ? <>使用可ポイント <b className="hl">{pointsLeft}</b> <span className="mini-lab">/ {save.currency.points}（下書き {pointsUsed}）</span></>
            : <>使用可SP <b className="hl">{skillLeft}</b> <span className="mini-lab">/ {save.currency.skillPoints}（下書き {skillUsed}）</span></>}
        </div>
        <button className="btn ghost sm" disabled={!hasDraft} onClick={resetAll}>↺ リセット</button>
      </div>

      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={mode === 'attr' ? 'on' : ''} onClick={() => setMode('attr')}>能力配分</button>
        <button className={mode === 'skill' ? 'on' : ''} onClick={() => setMode('skill')}>必殺技習得</button>
      </div>

      {/* 角色選擇器 */}
      <div className="charpick">
        {chars.map((c) => {
          const cs = save.characters[c.id];
          const cnt = charDraftCount(c);
          const tc = TEAMS[c.team]?.color;
          return (
            <button key={c.id} className={'cp-chip' + (sel === c.id ? ' active' : '')}
              style={sel === c.id ? { borderColor: tc } : undefined} onClick={() => setSel(c.id)}>
              <span className="cp-ava">{cs?.customAvatar ? <img src={cs.customAvatar} alt="" /> : '🎾'}</span>
              <span className="cp-nm">{c.name}</span>
              <span className="mini-lab">Lv{cs?.level || 1}</span>
              {cnt > 0 && <span className="badge" style={{ background: tc }}>{mode === 'attr' ? `+${cnt}` : cnt}</span>}
            </button>
          );
        })}
      </div>

      {!selChar ? <div className="empty">キャラを選んで配分を開始</div> : mode === 'attr' ? (
        <AttrAlloc char={selChar} charState={save.characters[selChar.id]} draft={attrDraft[selChar.id] || {}} onSet={setAttr} />
      ) : (
        <SkillAlloc char={selChar} charState={save.characters[selChar.id]} effAttrs={effAttrs(selChar.id)}
          skillLeft={skillLeft} queued={skillDraft[selChar.id] || []} onToggle={toggleSkill} template={template} />
      )}

      {/* 草稿摘要 */}
      {hasDraft && (
        <div className="draft-summary">
          <div style={{ fontWeight: 800, marginBottom: 4 }}>今回の配分（下書き）</div>
          {Object.entries(attrDraft).map(([cid, m]) => {
            const sum = Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
            if (!sum) return null;
            const c = chars.find((x) => x.id === cid);
            return <div className="ds-row" key={cid}><span>{c?.name}（能力）</span><span>−{sum} pt</span></div>;
          })}
          {Object.entries(skillDraft).map(([cid, ids]) => {
            const valid = ids.filter((id) => !save.characters[cid]?.learnedSkills.includes(id));
            if (!valid.length) return null;
            const c = chars.find((x) => x.id === cid);
            const cost = valid.reduce((a, id) => a + (template.skills.find((k) => k.id === id)?.cost || 0), 0);
            return <div className="ds-row" key={cid}><span>{c?.name}（{valid.length} 技）</span><span>−{cost} SP</span></div>;
          })}
        </div>
      )}

      <button className="btn block" style={{ marginTop: 14 }} disabled={busy || !hasDraft || pointsLeft < 0 || skillLeft < 0} onClick={save_}>
        {pointsLeft < 0 || skillLeft < 0 ? '上限オーバー' : busy ? '保存中…' : '配分を保存'}
      </button>
    </div>
  );
}

function AttrAlloc({ char, charState, draft, onSet }) {
  const targetStage = char.stages[Math.min(charState.level, 5)];
  return (
    <div>
      {ATTR_GROUP_LIST.map((g) => (
        <div key={g.id} style={{ marginTop: 10 }}>
          <div className="mini-lab" style={{ fontWeight: 800, marginBottom: 2 }}>{g.label}</div>
          {g.keys.map((key) => {
            const isSig = char.signatureAttr === key;
            const pts = draft[key] || 0;
            const grids = previewGrids(pts, isSig);
            const cur = Math.round((charState.attrs[key] || 0) * 10) / 10;
            const tgt = targetStage[ATTR_KEYS.indexOf(key)];
            return (
              <div className="alloc-row" key={key}>
                <span className={'a-nm' + (isSig ? ' sig' : '')}>
                  {ATTR_LABELS[key]}{isSig ? ' ★' : ''}<span className="mini-lab"> · 現在 {cur} / 目標 {tgt}</span>
                </span>
                <span className="a-prev">{grids > 0 ? `+${grids}` : ''}</span>
                <input type="number" min="0" inputMode="numeric" placeholder="0"
                  value={draft[key] ?? ''} onChange={(e) => onSet(char.id, key, e.target.value)} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SkillAlloc({ char, charState, effAttrs, skillLeft, queued, onToggle, template }) {
  const skills = template.skills
    .filter((s) => s.charId === char.id)
    .sort((a, b) => (DIFFICULTY[a.difficulty]?.rank || 0) - (DIFFICULTY[b.difficulty]?.rank || 0) || a.requiredStage - b.requiredStage);
  // 用「考慮草稿後的屬性」判定門檻
  const stateForGate = { ...charState, attrs: effAttrs };
  if (!skills.length) return <div className="empty">このキャラに必殺技がありません</div>;
  return (
    <div className="skill-grid">
      {skills.map((skill) => {
        const isQueued = queued.includes(skill.id);
        const st = skillStatus(skill, stateForGate, skillLeft + (isQueued ? skill.cost : 0));
        const diff = DIFFICULTY[skill.difficulty] || { color: '#888' };
        const canQueue = st.state === 'available' || isQueued;
        return (
          <div key={skill.id} className={'skill ' + (st.state === 'learned' ? 'learned' : isQueued ? 'available' : st.state)}>
            <div className="s-main">
              <div className="s-name">{skill.name}</div>
              <div className="s-tags">
                <span className="tag diff" style={{ background: diff.color }}>{skill.difficulty}</span>
                <span className="tag">段階 ≥{skill.requiredStage}</span>
                <span className="tag cost">{skill.cost} SP</span>
              </div>
              <div className="s-reqs">
                {skill.attrRequirements.map((req) => {
                  const have = Math.round((effAttrs[req.attr] || 0) * 10) / 10;
                  const ok = have >= req.min;
                  return <span key={req.attr} className={ok ? 'ok' : 'no'}>{ATTR_LABELS[req.attr]?.slice(0, 2)} {have}/{req.min}{ok ? '✓' : ''}</span>;
                })}
              </div>
            </div>
            <div className="s-side">
              {st.state === 'learned' ? <span className="s-check">✓</span>
                : isQueued ? <button className="btn sm outline" onClick={() => onToggle(char.id, skill.id)}>取消</button>
                : st.state === 'available' ? <button className="btn sm" onClick={() => onToggle(char.id, skill.id)}>追加</button>
                : <span className="s-state">{charState.level < skill.requiredStage ? `段階${skill.requiredStage}必要` : skillLeft < skill.cost ? 'SP不足' : '条件未達'}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

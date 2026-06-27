// 角色內容（頭部在 HERO）：等級進度 / 三組「大雷達 + 五維數值」/ 絕招 / 動態 / 禮物
import RadarChart from './RadarChart.jsx';
import SkillList from './SkillList.jsx';
import GiftArea from './GiftArea.jsx';
import MemoryFeed from './MemoryFeed.jsx';
import { ATTR_GROUP_LIST, ATTR_LABELS_SHORT, ATTR_KEYS, TEAMS } from '../lib/constants.js';
import { levelProgress } from '../lib/engine.js';
import { useGame } from '../lib/store.jsx';

export default function CharacterPanel({ char }) {
  const { save, addCharPost, updateCharPost, deleteCharPost } = useGame();
  const charState = save.characters[char.id];
  if (!charState) return null;

  const accent = TEAMS[char.team]?.color || '#c47d8e';
  const level = charState.level;
  const targetStage = char.stages[Math.min(level, 5)];
  const prog = levelProgress(charState, char);

  return (
    <div className="cp-body">
      {level < 6 && <div className="lv-bar"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>}

      <div className="abilities-head">
        <div>
          <div className="eyebrow">ABILITIES</div>
          <h2 className="ab-title">能力プロフィール</h2>
        </div>
        <div className="legend">
          <span><i className="cur" />現在</span>
          <span><i className="tgt" />目標段階</span>
        </div>
      </div>

      {ATTR_GROUP_LIST.map((g) => (
        <div className="attr-group" key={g.id}>
          <div className="ag-head">
            <div className="ag-letter">{g.id}</div>
            <div className="ag-name">{g.label}</div>
          </div>
          <div className="ag-radar">
            <RadarChart keys={g.keys} current={charState.attrs}
              target={g.keys.map((k) => targetStage[ATTR_KEYS.indexOf(k)])}
              signatureAttr={char.signatureAttr} accent={accent} />
          </div>
          <div className="vals">
            {g.keys.map((k) => {
              const sig = char.signatureAttr === k;
              return (
                <div className={'val-row' + (sig ? ' sig' : '')} key={k}>
                  <span className="vn">{ATTR_LABELS_SHORT[k]}{sig ? ' ★' : ''}</span>
                  <span className="vc">{Math.round((charState.attrs[k] || 0) * 10) / 10}</span>
                  <span className="vt">/ {targetStage[ATTR_KEYS.indexOf(k)]}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="section-title">必殺技 · 習得状況</div>
      <SkillList char={char} charState={charState} />

      <div className="section-title">ダイアリー · 写真と記録</div>
      <MemoryFeed
        posts={charState.memories || []}
        onAdd={(p) => addCharPost(char.id, p)}
        onUpdate={(id, patch) => updateCharPost(char.id, id, patch)}
        onDelete={(id) => deleteCharPost(char.id, id)}
        placeholder={`${char.name}との思い出を綴る…`}
      />

      <div className="section-title">プレゼント · 思い出</div>
      <GiftArea char={char} charState={charState} />
    </div>
  );
}

// 主頁：球場 HERO（戰隊 / 角色頁籤 / 角色頭部）+ 扁平錢包 + 角色內容
import { useState, useMemo, useRef } from 'react';
import CharacterPanel from './CharacterPanel.jsx';
import MemoryFeed from './MemoryFeed.jsx';
import Modal from './Modal.jsx';
import { POSITION_ORDER, TEAMS, TEAM_ORDER, ATTR_LABELS_SHORT } from '../lib/constants.js';
import { useGame } from '../lib/store.jsx';
import heroImg from '../assets/hero.jpg';

const HERO_BG = {
  backgroundImage: `linear-gradient(180deg, rgba(245,238,228,0.06) 0%, rgba(245,238,228,0) 34%, rgba(36,30,34,0.42) 100%), url(${heroImg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center 30%',
};

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});
const fmt = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('en-US');

export default function Home({ team, setTeam, charId, setCharId, onOpenSettings }) {
  const { template, save, addTeamPost, updateTeamPost, deleteTeamPost, setAvatar } = useGame();
  const [memoOpen, setMemoOpen] = useState(false);
  const fileRef = useRef(null);

  const teamChars = useMemo(() => {
    const inTeam = (template?.characters || []).filter((c) => c.team === team);
    return POSITION_ORDER.flatMap((pos) => inTeam.filter((c) => c.position === pos));
  }, [template, team]);

  const selected = teamChars.find((c) => c.id === charId) || teamChars[0];
  const cs = selected && save.characters[selected.id];
  const c = save.currency;

  const onPickAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (f && selected) await setAvatar(selected.id, await fileToDataUrl(f));
    e.target.value = '';
  };

  return (
    <>
      <div className="hero" style={HERO_BG}>
        <div className="hero-actions">
          {template && <button className="ic-btn" onClick={() => setMemoOpen(true)} aria-label="共有メモリー">📓</button>}
          <button className="ic-btn" onClick={onOpenSettings} aria-label="設定">⚙️</button>
        </div>
        <div className="hz" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="hero-top">
            <div className="team-pills">
              {TEAM_ORDER.map((id) => (
                <button key={id} className={'team-pill' + (team === id ? ' active' : '')} onClick={() => setTeam(id)}>
                  <span className="dot" style={{ background: TEAMS[id].color }} />{TEAMS[id].label}
                </button>
              ))}
            </div>
          </div>

          {!template ? (
            <div className="empty" style={{ color: 'rgba(60,50,46,.8)', marginTop: 40 }}>
              キャラデータ未読み込み。<br />右上の ⚙️ → キャラ読込 から CSV をアップロード、またはサンプルを読込。
            </div>
          ) : (
            <>
              <div className="char-tabs">
                {teamChars.map((ch) => (
                  <button key={ch.id} className={'char-tab' + (selected?.id === ch.id ? ' active' : '')} onClick={() => setCharId(ch.id)}>
                    <span className="pos">{ch.position}</span>
                    <span className="nm">{ch.name}</span>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="hero-head">
                  <button className="avatar" onClick={() => fileRef.current?.click()} title="アイコンを変更">
                    {cs?.customAvatar ? <img src={cs.customAvatar} alt="" /> : selected.name.slice(0, 2)}
                    <span className="cam">📷</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
                  <div className="meta">
                    <div className="pos">{selected.position} · {selected.growthType}</div>
                    <div className="nm">{selected.name}</div>
                    <div className="lv">Lv.{cs?.level || 1}<span className="sig"> · 得意：{ATTR_LABELS_SHORT[selected.signatureAttr]} ×1.5</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="wallet-wrap">
        <div className="wallet">
          <div className="coin"><IconTarget /><span className="val" style={{ color: '#c75d82' }}>{fmt(c.points)}</span></div>
          <div className="coin"><IconBolt /><span className="val" style={{ color: '#3d84aa' }}>{fmt(c.skillPoints)}</span></div>
          <div className="coin"><IconHeart /><span className="val" style={{ color: '#b8863e' }}>{fmt(c.catCoins)}</span></div>
        </div>
      </div>

      {template && selected && (
        <div className="content"><CharacterPanel char={selected} /></div>
      )}

      {memoOpen && (
        <Modal title={`${TEAMS[team].label} · 共有メモリー`} onClose={() => setMemoOpen(false)}>
          <MemoryFeed
            posts={save.teamFeed?.[team] || []}
            onAdd={(p) => addTeamPost(team, p)}
            onUpdate={(id, patch) => updateTeamPost(team, id, patch)}
            onDelete={(id) => deleteTeamPost(team, id)}
            placeholder="チームの物語・約束・思い出を投稿…"
          />
        </Modal>
      )}
    </>
  );
}

const IconTarget = () => (
  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#ef8fb3" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="#ef8fb3" strokeWidth="2" /><circle cx="12" cy="12" r="1.6" fill="#ef8fb3" /></svg>
);
const IconBolt = () => (
  <svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="#7cc3e6" /></svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.6-9.3-9.2C1.2 7.7 2.7 4.7 5.7 4.4c1.9-.2 3.4 1 4.3 2.3.9-1.3 2.4-2.5 4.3-2.3 3 .3 4.5 3.3 3 6.4C19 15.4 12 20 12 20z" stroke="#d0a85f" strokeWidth="1.8" /></svg>
);

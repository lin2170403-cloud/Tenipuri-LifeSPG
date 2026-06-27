import { useState, useEffect } from 'react';
import { useGame } from './lib/store.jsx';
import { TEAMS } from './lib/constants.js';
import Home from './components/Home.jsx';
import Settings from './components/Settings.jsx';
import Modal from './components/Modal.jsx';

export default function App() {
  const { ready, template, toasts } = useGame();
  const [team, setTeam] = useState('pink');
  const [charId, setCharId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!template) return;
    const first = template.characters.find((c) => c.team === team);
    setCharId((cur) => {
      const ok = template.characters.find((c) => c.id === cur && c.team === team);
      return ok ? cur : (first?.id || null);
    });
  }, [team, template]);

  if (!ready) return <div className="empty" style={{ paddingTop: 120 }}>🎾 セーブデータを読み込み中…</div>;

  const t = TEAMS[team];
  const accentStyle = { '--accent': t.color, '--accent-soft': t.soft, '--accent-deep': t.deep };

  return (
    <div className="app" style={accentStyle}>
      <Home team={team} setTeam={setTeam} charId={charId} setCharId={setCharId} onOpenSettings={() => setSettingsOpen(true)} />

      {settingsOpen && (
        <Modal title="⚙️ 設定" full onClose={() => setSettingsOpen(false)}>
          <Settings />
        </Modal>
      )}

      <div className="toast-wrap">
        {toasts.map((to) => (
          <div key={to.id} className={'toast' + (to.type === 'celebrate' ? ' celebrate' : '')}>{to.msg}</div>
        ))}
      </div>
    </div>
  );
}

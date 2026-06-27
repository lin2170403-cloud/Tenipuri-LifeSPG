// 設定（由主頁按鈕開啟的彈窗內容）。子導航切換五個區塊。
import { useState } from 'react';
import ScoringPanel from './ScoringPanel.jsx';
import AllocationCenter from './AllocationCenter.jsx';
import ShopManager from './ShopManager.jsx';
import BackupPanel from './BackupPanel.jsx';
import ImportPanel from './ImportPanel.jsx';

const TABS = [
  { id: 'settle', label: 'デイリー' },
  { id: 'alloc', label: '配分' },
  { id: 'shop', label: 'ショップ' },
  { id: 'backup', label: 'バックアップ' },
  { id: 'import', label: 'キャラ読込' },
];

export default function Settings({ initial = 'settle' }) {
  const [tab, setTab] = useState(initial);
  return (
    <div>
      <div className="settings-nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'settle' && <ScoringPanel />}
      {tab === 'alloc' && <AllocationCenter />}
      {tab === 'shop' && <ShopManager />}
      {tab === 'backup' && <BackupPanel />}
      {tab === 'import' && <ImportPanel />}
    </div>
  );
}

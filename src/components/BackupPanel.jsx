// 設定頁② 數據備份：導出（SaveState+模板快照 JSON）/ 導入還原 / 自動備份歷史
import { useState, useEffect } from 'react';
import { bundleToJson } from '../lib/storage.js';
import { listBackups, getBackup } from '../lib/storage.js';
import { parseJsonImport } from '../lib/parse.js';
import { todayISO } from '../lib/engine.js';
import { useGame } from '../lib/store.jsx';

const readText = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsText(file, 'utf-8');
});

export default function BackupPanel() {
  const { template, save, restoreBundle, toast } = useGame();
  const [backups, setBackups] = useState([]);

  const refresh = () => listBackups().then(setBackups);
  useEffect(() => { refresh(); }, [save.lastUpdated]);

  const doExport = () => {
    const json = bundleToJson(template, save);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yousei-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('バックアップを書き出しました', 'info');
  };

  const doImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await readText(f);
      const parsed = parseJsonImport(text);
      await restoreBundle(parsed);
      toast('バックアップを復元しました', 'celebrate');
    } catch (err) {
      toast('復元に失敗：' + err.message, 'info');
    }
    e.target.value = '';
  };

  const restoreAuto = async (key) => {
    const b = await getBackup(key);
    if (!b) return;
    await restoreBundle({ template: b.template, save: b.save });
    toast('自動バックアップから復元しました', 'celebrate');
  };

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>データバックアップ</div>
      <div className="note">セーブ消失 = 進捗ゼロ。大きな進展ごとに手動で書き出すと安心。重要な変更時には自動バックアップも静かに保存されます。</div>

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn block" onClick={doExport} disabled={!template}>⬇ バックアップを書き出し（JSON）</button>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label>復元（バックアップ JSON を読込）</label>
        <input className="input" type="file" accept=".json,application/json" onChange={doImport} />
      </div>

      {backups.length > 0 && (
        <>
          <div className="section-title">自動バックアップ履歴（最近 {backups.length} 件）</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {backups.map((key) => (
              <div key={key} className="alloc-row">
                <span className="a-nm">{new Date(key).toLocaleString('ja-JP')}</span>
                <button className="btn sm ghost" onClick={() => restoreAuto(key)}>復元</button>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mini-lab" style={{ marginTop: 10 }}>
        最終保存：{new Date(save.lastUpdated).toLocaleString('ja-JP')}
      </div>
    </div>
  );
}

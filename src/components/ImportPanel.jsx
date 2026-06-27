// 設定頁④ 角色數據導入：CSV（角色成長表 + 技能表）/ JSON（StaticTemplate 或備份）
// 解析 → 預覽校驗 → 確認後覆蓋 StaticTemplate（養成存檔不受影響）
import { useState } from 'react';
import { buildTemplateFromCsv, parseJsonImport } from '../lib/parse.js';
import { useGame } from '../lib/store.jsx';

const readText = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsText(file, 'utf-8');
});

export default function ImportPanel() {
  const { template, importTemplate, restoreBundle, toast } = useGame();
  const [charsText, setCharsText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const parse = (cText = charsText, sText = skillsText) => {
    if (!cText) { setReport(null); return; }
    try {
      const res = buildTemplateFromCsv(cText, sText);
      setReport(res);
    } catch (e) {
      setReport({ errors: ['解析失敗：' + e.message], warnings: [], stats: { characters: 0, skills: 0 }, template: null });
    }
  };

  const onChars = async (e) => { const f = e.target.files?.[0]; if (!f) return; const t = await readText(f); setCharsText(t); parse(t, skillsText); };
  const onSkills = async (e) => { const f = e.target.files?.[0]; if (!f) return; const t = await readText(f); setSkillsText(t); parse(charsText, t); };

  const loadSample = async () => {
    setBusy(true);
    try {
      const base = import.meta.env.BASE_URL || '/';
      const [c, s] = await Promise.all([
        fetch(base + 'sample/characters.csv').then((r) => r.text()),
        fetch(base + 'sample/skills.csv').then((r) => r.text()),
      ]);
      setCharsText(c); setSkillsText(s); parse(c, s);
    } catch {
      toast('サンプルの読込に失敗', 'info');
    }
    setBusy(false);
  };

  const confirm = async () => {
    if (!report?.template || report.errors.length) return;
    setBusy(true);
    await importTemplate(report.template);
    setBusy(false);
    toast(`${report.stats.characters} キャラ / ${report.stats.skills} 技 を読み込みました`, 'celebrate');
    setReport(null); setCharsText(''); setSkillsText('');
  };

  const onJson = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await readText(f);
      const { template: t, save } = parseJsonImport(text);
      if (save) {
        await restoreBundle({ template: t, save });
        toast('バックアップから復元しました', 'celebrate');
      } else {
        await importTemplate(t);
        toast(`${t.characters.length} キャラを読込（JSON）`, 'celebrate');
      }
    } catch (err) {
      toast('JSON 解析エラー：' + err.message, 'info');
    }
    e.target.value = '';
  };

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>キャラデータ読込</div>
      <div className="note">
        テンプレ（ルール）とセーブ（進捗）は別管理。新テンプレの読込で進捗が<b>消えることはありません</b>。
        {template && <><br />現在のテンプレ：<b className="hl">{template.characters.length}</b> キャラ / <b className="hl">{template.skills.length}</b> 技。</>}
      </div>

      <div className="row2" style={{ marginTop: 12 }}>
        <div className="field"><label>キャラ成長表 characters.csv</label><input className="input" type="file" accept=".csv,text/csv" onChange={onChars} /></div>
        <div className="field"><label>技表 skills.csv</label><input className="input" type="file" accept=".csv,text/csv" onChange={onSkills} /></div>
      </div>
      <button className="btn ghost sm" onClick={loadSample} disabled={busy}>↻ 内蔵サンプルを読込（21キャラ/101技）</button>

      {report && (
        <div style={{ marginTop: 12 }}>
          <div className={report.errors.length ? 'err-list' : 'ok-banner'}>
            {report.errors.length
              ? <><b>検証エラー（{report.errors.length}）：</b>{report.errors.slice(0, 40).map((e, i) => <div key={i}>· {e}</div>)}</>
              : <>✅ 検証OK：<b>{report.stats.characters}</b> キャラ / <b>{report.stats.skills}</b> 技 を読込</>}
          </div>
          {report.warnings.length > 0 && (
            <div className="warn-list"><b>注意（{report.warnings.length}）：</b>{report.warnings.slice(0, 20).map((w, i) => <div key={i}>· {w}</div>)}</div>
          )}
          <button className="btn block" style={{ marginTop: 10 }} disabled={busy || report.errors.length || !report.template} onClick={confirm}>
            読込を確定 → テンプレ更新
          </button>
        </div>
      )}

      <div className="section-title">または：JSON 読込（テンプレ / フルバックアップ）</div>
      <input className="input" type="file" accept=".json,application/json" onChange={onJson} />
    </div>
  );
}

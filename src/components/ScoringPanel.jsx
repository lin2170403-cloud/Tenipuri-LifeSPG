// デイリーチェックイン。詳細／簡易の 2 入力。カレンダーで過去の獲得を振り返り。
import { useState, useMemo } from 'react';
import { BLOCKS, CHORE_ITEMS } from '../lib/constants.js';
import {
  computeBlocks, blocksTotal, skillPointsFromTotal,
  scoreRecord, scoreDaily, scoreWork, scoreChores,
  reachedBlocks, computeStreaks, computeCatCoins, todayISO,
} from '../lib/engine.js';
import { useGame } from '../lib/store.jsx';

const OPT = {
  sleepIn: [[10, '12時前 (10)'], [8, '1時前 (8)'], [5, '2時前 (5)'], [0, 'それ以降 (0)']],
  sleepOut: [[10, '8時前 (10)'], [8, '9時前 (8)'], [5, '10時前 (5)'], [0, 'それ以降 (0)']],
  mealCoef: [[1, '三食 ×1'], [0.8, '二食 ×0.8'], [0.5, '一食 ×0.5'], [0, '未食 ×0']],
  foodQuality: [[20, 'A (20)'], [18, 'B (18)'], [12, 'C (12)'], [10, 'D (10)'], [0, '未評価 (0)']],
  water: [[5, '≥1200ml (5)'], [3, '≥800ml (3)'], [0, 'それ未満 (0)']],
  cleanTimes: [[2, '2回 (5)'], [1, '1回 (1)'], [0, '未実施 (0)']],
  skincareTimes: [[2, '2回 (3)'], [1, '1回 (1)'], [0, '未実施 (0)']],
  supplement: [[2, '三点セット (2)'], [1, '1–2項 (1)'], [0, 'なし (0)']],
  spend: [[10, '≤3000 (10)'], [5, '≤4000 (5)'], [3, '≤5000 (3)'], [0, '>5000 (0)']],
};

const defaultForm = () => ({
  recordCount: 0,
  daily: { sleepIn: 0, sleepOut: 0, noSnooze: false, mealCoef: 0, foodQuality: 0, cook: false, water: 0, cleanTimes: 0, washHair: false, nails: false, skincareTimes: 0, mask: false, eyeCream: false, supplement: 0, spend: 0 },
  work: { hoursS: 0, hoursA: 0, hoursB: 0, hoursC: 0, pagesPhil: 0, pagesNormal: 0, writeChars: 0, bonusDoc: 0, bonusJob: 0, bonusWrite: 0 },
  chores: Object.fromEntries(CHORE_ITEMS.map((c) => [c.id, 'none'])),
  manual: { enabled: false, p1: 0, p2: 0, p3: 0, p4: 0 },
});

const Sel = ({ value, onChange, options }) => (
  <select className="input" value={value} onChange={(e) => onChange(Number(e.target.value))}>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);
const NumF = ({ value, onChange, step = 1 }) => (
  <input className="input" type="number" min="0" step={step} inputMode="decimal"
    value={value || ''} placeholder="0" onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
);

export default function ScoringPanel() {
  const { settleDay, save, toast } = useGame();
  const [form, setForm] = useState(defaultForm);
  const [date, setDate] = useState(todayISO());

  const setDaily = (k, v) => setForm((f) => ({ ...f, daily: { ...f.daily, [k]: v } }));
  const setWork = (k, v) => setForm((f) => ({ ...f, work: { ...f.work, [k]: v } }));
  const setChore = (id, v) => setForm((f) => ({ ...f, chores: { ...f.chores, [id]: v } }));
  const setManual = (k, v) => setForm((f) => ({ ...f, manual: { ...f.manual, [k]: v } }));

  const blocks = useMemo(() => computeBlocks(form), [form]);
  const total = blocksTotal(blocks);
  const skillPts = skillPointsFromTotal(total);
  const preview = useMemo(() => {
    const reached = reachedBlocks(blocks);
    const streaks = computeStreaks(save.streakLog, date, reached);
    return { reached, streaks, cat: computeCatCoins(streaks, total) };
  }, [blocks, total, save.streakLog, date]);

  // その日が計上済みか（1 日 1 回）
  const past = (save.dailyLog || []).find((e) => e.date === date);
  const settled = !!past;
  const strip = settled
    ? { ...past.breakdown, total: past.total, skill: past.skillPts ?? skillPointsFromTotal(past.total), cat: past.catCoins ?? 0 }
    : { ...blocks, total, skill: skillPts, cat: preview.cat.total };

  const doSettle = async () => {
    const res = await settleDay(blocks, undefined, date);
    if (!res) return;
    toast(`計上：ポイント +${res.total}・SP +${res.skillPts}・🐱 +${res.catCoins}`, 'celebrate');
    setForm(defaultForm());
  };

  return (
    <div>
      <div className="daily-head">
        <div>
          <div className="eyebrow">DAILY CHECK-IN</div>
          <h2 className="daily-title">今日のポイント</h2>
        </div>
        <input className="date-pick" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} />
      </div>

      {/* 統計バー */}
      <div className="daily-strip">
        <Cell l="記録" v={strip.p1} />
        <Cell l="生活" v={strip.p2} />
        <Cell l="仕事" v={strip.p3} />
        <Cell l="家事" v={strip.p4} />
        <Cell l={date === todayISO() ? '今日合計' : '当日合計'} v={strip.total} big />
        <Cell l="SP" v={`+${strip.skill}`} />
        <Cell l="🐱" v={`+${strip.cat}`} />
      </div>

      {settled ? (
        <div className="empty">{date} 計上済み · 合計 {past.total} pt（1日1回）</div>
      ) : (
        <>
          <div className="seg" style={{ margin: '14px 0' }}>
            <button className={form.manual.enabled ? '' : 'on'} onClick={() => setManual('enabled', false)}>詳細入力</button>
            <button className={form.manual.enabled ? 'on' : ''} onClick={() => setManual('enabled', true)}>4項目を直接入力</button>
          </div>

          {form.manual.enabled ? (
            <div className="row2">
              {BLOCKS.map((b) => (
                <div className="field" key={b.key}>
                  <label>{b.label}（目標 {b.target}）</label>
                  <NumF value={form.manual[b.key]} step={0.5} onChange={(v) => setManual(b.key, v)} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <Block label="① 記録" target={10} score={scoreRecord(form)}>
                <div className="field" style={{ margin: 0 }}>
                  <label>今日の記録件数（1件 0.5 pt）</label>
                  <NumF value={form.recordCount} onChange={(v) => setForm((f) => ({ ...f, recordCount: v }))} />
                </div>
              </Block>

              <Block label="② 生活" target={50} score={scoreDaily(form)}>
                <div className="row2">
                  <L l="就寝"><Sel value={form.daily.sleepIn} options={OPT.sleepIn} onChange={(v) => setDaily('sleepIn', v)} /></L>
                  <L l="起床"><Sel value={form.daily.sleepOut} options={OPT.sleepOut} onChange={(v) => setDaily('sleepOut', v)} /></L>
                  <L l="食事"><Sel value={form.daily.mealCoef} options={OPT.mealCoef} onChange={(v) => setDaily('mealCoef', v)} /></L>
                  <L l="食事の質"><Sel value={form.daily.foodQuality} options={OPT.foodQuality} onChange={(v) => setDaily('foodQuality', v)} /></L>
                  <L l="水分"><Sel value={form.daily.water} options={OPT.water} onChange={(v) => setDaily('water', v)} /></L>
                  <L l="清潔セット（×2/日）"><Sel value={form.daily.cleanTimes} options={OPT.cleanTimes} onChange={(v) => setDaily('cleanTimes', v)} /></L>
                  <L l="スキンケア（×2/日）"><Sel value={form.daily.skincareTimes} options={OPT.skincareTimes} onChange={(v) => setDaily('skincareTimes', v)} /></L>
                  <L l="サプリ"><Sel value={form.daily.supplement} options={OPT.supplement} onChange={(v) => setDaily('supplement', v)} /></L>
                  <L l="支出"><Sel value={form.daily.spend} options={OPT.spend} onChange={(v) => setDaily('spend', v)} /></L>
                  <L l="二度寝<20分"><BoolSel v={form.daily.noSnooze} on={(v) => setDaily('noSnooze', v)} pts={5} /></L>
                  <L l="自炊"><BoolSel v={form.daily.cook} on={(v) => setDaily('cook', v)} pts={5} /></L>
                  <L l="洗髪"><BoolSel v={form.daily.washHair} on={(v) => setDaily('washHair', v)} pts={5} /></L>
                  <L l="爪切り"><BoolSel v={form.daily.nails} on={(v) => setDaily('nails', v)} pts={2} /></L>
                  <L l="パック"><BoolSel v={form.daily.mask} on={(v) => setDaily('mask', v)} pts={2} /></L>
                  <L l="アイクリーム/ボディ"><BoolSel v={form.daily.eyeCream} on={(v) => setDaily('eyeCream', v)} pts={1} /></L>
                </div>
              </Block>

              <Block label="③ 仕事" target={60} score={scoreWork(form)}>
                <div className="row2">
                  <L l="S難度 時間 ×10"><NumF value={form.work.hoursS} step={0.5} onChange={(v) => setWork('hoursS', v)} /></L>
                  <L l="A難度 時間 ×7"><NumF value={form.work.hoursA} step={0.5} onChange={(v) => setWork('hoursA', v)} /></L>
                  <L l="B難度 時間 ×5"><NumF value={form.work.hoursB} step={0.5} onChange={(v) => setWork('hoursB', v)} /></L>
                  <L l="C難度 時間 ×3"><NumF value={form.work.hoursC} step={0.5} onChange={(v) => setWork('hoursC', v)} /></L>
                  <L l="哲学文献ページ ×3"><NumF value={form.work.pagesPhil} onChange={(v) => setWork('pagesPhil', v)} /></L>
                  <L l="一般文献ページ ×1"><NumF value={form.work.pagesNormal} onChange={(v) => setWork('pagesNormal', v)} /></L>
                  <L l="執筆文字数 /500×3"><NumF value={form.work.writeChars} step={100} onChange={(v) => setWork('writeChars', v)} /></L>
                  <L l="執筆1000字 ×20"><NumF value={form.work.bonusWrite} onChange={(v) => setWork('bonusWrite', v)} /></L>
                </div>
                <div className="row2" style={{ marginTop: 6 }}>
                  <L l="文献マイルストーン ×20"><NumF value={form.work.bonusDoc} onChange={(v) => setWork('bonusDoc', v)} /></L>
                  <L l="就活ステップ ×20"><NumF value={form.work.bonusJob} onChange={(v) => setWork('bonusJob', v)} /></L>
                </div>
              </Block>

              <Block label="④ 家事" target={20} score={scoreChores(form)}>
                {CHORE_ITEMS.map((it) => (
                  <div className="alloc-row" key={it.id}>
                    <span className="a-nm">{it.name} <span className="mini-lab">({it.score})</span></span>
                    <select className="input" style={{ width: 150 }} value={form.chores[it.id]} onChange={(e) => setChore(it.id, e.target.value)}>
                      <option value="none">未実施</option>
                      <option value="ontime">定刻 ({it.score})</option>
                      <option value="buffer">猶予 ({it.score / 2})</option>
                      <option value="deepclean">大掃除 ({Math.round(it.score / 4 * 10) / 10})</option>
                    </select>
                  </div>
                ))}
              </Block>
            </>
          )}

          <div className="reached">
            {BLOCKS.map((b) => (
              <span key={b.key} className={'pill' + (preview.reached.includes(b.key) ? ' on' : '')}>
                {b.label} {blocks[b.key]}/{b.target} · 連続{preview.streaks[b.key]}日
              </span>
            ))}
          </div>

          <button className="btn block" style={{ marginTop: 14 }} onClick={doSettle} disabled={total <= 0}>
            計上する
          </button>
        </>
      )}
    </div>
  );
}

const Cell = ({ l, v, big }) => (
  <div className={'dc-cell' + (big ? ' big' : '')}><div className="dc-l">{l}</div><div className="dc-v">{v}</div></div>
);
const Block = ({ label, target, score, children }) => (
  <div className="score-block">
    <div className="sb-head"><span>{label}</span><span className="sb-score">{score} <span className="mini-lab">/ {target}</span></span></div>
    <div className="sb-body">{children}</div>
  </div>
);
const L = ({ l, children, full }) => <div className={'field' + (full ? ' full' : '')} style={{ margin: 0 }}><label>{l}</label>{children}</div>;
const BoolSel = ({ v, on, pts }) => (
  <select className="input" value={v ? '1' : '0'} onChange={(e) => on(e.target.value === '1')}>
    <option value="1">達成 (+{pts})</option>
    <option value="0">未達成</option>
  </select>
);

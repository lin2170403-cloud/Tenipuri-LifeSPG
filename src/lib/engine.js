// ===========================================================================
// 養成引擎 — 純函數。所有計算邏輯集中於此，方便自驗（見檔末 selfTest）。
// 公式來源：《養成引擎設計文檔》§1–§4 與《app開發指令》§2。
// 鐵律：只加不減，地板為 0，永不降階。
// ===========================================================================

import { ATTR_KEYS, RATES, BLOCKS, CHORE_ITEMS, CHORE_STATES } from './constants.js';

const clamp0 = (n) => (n > 0 ? n : 0);
const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// §1.3 四板塊算分。輸入一份「明細表單」form，回傳各板塊得分。
// form 結構見 ScoringPanel；此處只做純計算，不依賴 UI。
// ---------------------------------------------------------------------------

// ① 記錄：每條 0.5 分
export function scoreRecord(form) {
  const n = Number(form?.recordCount) || 0;
  return clamp0(round1(n * 0.5));
}

// ② 日常生活
export function scoreDaily(form) {
  const d = form?.daily || {};
  let s = 0;
  // 睡眠
  s += Number(d.sleepIn) || 0;   // 入睡 select 值
  s += Number(d.sleepOut) || 0;  // 起床 select 值
  if (d.noSnooze) s += 5;        // 賴床 <20 分
  // 進食：質量基礎分 × 正餐係數，自炊 +5
  const mealCoef = Number(d.mealCoef) || 0;   // 1 / 0.8 / 0.5 / 0
  const foodBase = Number(d.foodQuality) || 0; // A20 B18 C12 D10 / 0
  s += foodBase * mealCoef;
  if (d.cook) s += 5;
  // 飲水
  s += Number(d.water) || 0;     // 5 / 3 / 0
  // 個人清潔三件套：一天做 2 次得滿分 5，1 次僅 1 分
  const cleanTimes = Number(d.cleanTimes) || 0;
  s += cleanTimes >= 2 ? 5 : cleanTimes === 1 ? 1 : 0;
  if (d.washHair) s += 5;
  if (d.nails) s += 2;
  // 護膚三件套：2 次得滿分 3，1 次僅 1 分
  const skinTimes = Number(d.skincareTimes) || 0;
  s += skinTimes >= 2 ? 3 : skinTimes === 1 ? 1 : 0;
  if (d.mask) s += 2;
  if (d.eyeCream) s += 1;
  // 補品
  s += Number(d.supplement) || 0; // 2 / 1 / 0
  // 支出
  s += Number(d.spend) || 0;      // 10 / 5 / 3 / 0
  return clamp0(round1(s));
}

// ③ 工作
export function scoreWork(form) {
  const w = form?.work || {};
  let s = 0;
  s += (Number(w.hoursS) || 0) * 10;
  s += (Number(w.hoursA) || 0) * 7;
  s += (Number(w.hoursB) || 0) * 5;
  s += (Number(w.hoursC) || 0) * 3;
  s += (Number(w.pagesPhil) || 0) * 3;
  s += (Number(w.pagesNormal) || 0) * 1;
  s += ((Number(w.writeChars) || 0) / 500) * 3;
  // Bonus（里程碑）各 +20
  s += (Number(w.bonusDoc) || 0) * 20;
  s += (Number(w.bonusJob) || 0) * 20;
  s += (Number(w.bonusWrite) || 0) * 20;
  return clamp0(round1(s));
}

// ④ 家務：每項狀態 'none' | 'ontime'(原分) | 'buffer'(半分) | 'deepclean'(1/4 分)
export function scoreChores(form) {
  const c = form?.chores || {};
  let s = 0;
  for (const item of CHORE_ITEMS) {
    const mul = CHORE_STATES[c[item.id]];
    if (mul) s += item.score * mul;
  }
  return clamp0(round1(s));
}

// 把四板塊得分匯總。manual=true 時直接採用 form.manual 的四個數字。
export function computeBlocks(form) {
  if (form?.manual?.enabled) {
    const m = form.manual;
    return {
      p1: clamp0(round1(Number(m.p1) || 0)),
      p2: clamp0(round1(Number(m.p2) || 0)),
      p3: clamp0(round1(Number(m.p3) || 0)),
      p4: clamp0(round1(Number(m.p4) || 0)),
    };
  }
  return {
    p1: scoreRecord(form),
    p2: scoreDaily(form),
    p3: scoreWork(form),
    p4: scoreChores(form),
  };
}

export function blocksTotal(blocks) {
  return clamp0(round1(blocks.p1 + blocks.p2 + blocks.p3 + blocks.p4));
}

// 判斷各板塊今日是否達門檻（門檻可配置，預設 = 板塊目標值）
export function reachedBlocks(blocks, thresholds) {
  const th = thresholds || Object.fromEntries(BLOCKS.map((b) => [b.key, b.target]));
  return BLOCKS.filter((b) => blocks[b.key] >= (th[b.key] ?? b.target)).map((b) => b.key);
}

// ---------------------------------------------------------------------------
// §2.3 技能點
// ---------------------------------------------------------------------------
export function skillPointsFromTotal(total) {
  return round1(clamp0(total) * RATES.skillPointRate);
}

// ---------------------------------------------------------------------------
// §4.1 心意幣🐱 結算
// ---------------------------------------------------------------------------

// 由 streakLog + 今日 reached，算出四板塊各自「往回連續達標天數」（含今日）。
export function computeStreaks(streakLog, todayStr, todayReached) {
  // 建 date → Set(reached) 映射；今日用傳入的 reached 覆蓋
  const map = {};
  for (const e of streakLog || []) map[e.date] = new Set(e.reached);
  map[todayStr] = new Set(todayReached);

  const count = (blockKey) => {
    let n = 0;
    const d = new Date(todayStr + 'T00:00:00');
    // 安全上限：往回最多數 1000 天
    for (let i = 0; i < 1000; i += 1) {
      const ds = isoDate(d);
      const set = map[ds];
      if (set && set.has(blockKey)) {
        n += 1;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return n;
  };
  return { p1: count('p1'), p2: count('p2'), p3: count('p3'), p4: count('p4') };
}

// 基本單位：連續≥7→500；3–6→200；1–2→100；0→0
function baseUnit(streak) {
  if (streak >= 7) return 500;
  if (streak >= 3) return 200;
  if (streak >= 1) return 100;
  return 0;
}

const SINGLE_MULT = { p1: 1, p2: 2, p3: 5, p4: 2 };

// 核心：給定四板塊連續天數 + 當日總分 → 心意幣。
export function computeCatCoins(streaks, dailyTotal) {
  // 按「連續天數相同」分組（只含 streak>0 的板塊）
  const groups = {};
  for (const key of ['p1', 'p2', 'p3', 'p4']) {
    const s = streaks[key] || 0;
    if (s <= 0) continue;
    (groups[s] = groups[s] || []).push(key);
  }
  let total = 0;
  const detail = [];
  for (const [sStr, members] of Object.entries(groups)) {
    const s = Number(sStr);
    const B = baseUnit(s);
    const has = (k) => members.includes(k);
    const all4 = has('p1') && has('p2') && has('p3') && has('p4');
    const comboWith3 = has('p3') && (has('p1') || has('p2') || has('p4'));
    const combo124 = has('p1') && has('p2') && has('p4');
    let contrib = 0;
    let mult = '';
    if (all4) { contrib = B * 20; mult = '①②③④全 ×20'; }
    else if (comboWith3) { contrib = B * 10; mult = '+③ ×10'; }
    else if (combo124) { contrib = B * 5; mult = '①②④ ×5'; }
    else {
      // 湊不成組合：各板塊取單項倍率相加
      contrib = members.reduce((acc, k) => acc + B * SINGLE_MULT[k], 0);
      mult = members.map((k) => `${k}×${SINGLE_MULT[k]}`).join('+');
    }
    total += contrib;
    detail.push({ streak: s, members: [...members], base: B, mult, contrib });
  }
  let bonus = 0;
  if (dailyTotal > RATES.catBonusThreshold) { bonus = RATES.catBonus; total += bonus; }
  return { total, detail, bonus };
}

// ---------------------------------------------------------------------------
// §2.2 投資：積分 → 屬性格。回傳新 attrs（不修改原物件）+ 升階結果。
// ---------------------------------------------------------------------------

// 預覽單筆投資漲幾格（招牌屬性 ×1.5）
export function previewGrids(points, isSignature) {
  const grids = (Number(points) || 0) * RATES.pointToGrid * (isSignature ? RATES.signatureMultiplier : 1);
  return round1(grids);
}

// 套用一份分配 alloc: { attrKey: points } 到角色狀態，回傳 { attrs, spent, gained }
export function applyAllocation(charState, charTemplate, alloc) {
  const attrs = { ...charState.attrs };
  let spent = 0;
  const gained = {};
  for (const key of ATTR_KEYS) {
    const pts = Number(alloc[key]) || 0;
    if (pts <= 0) continue;
    const isSig = charTemplate.signatureAttr === key;
    const grids = previewGrids(pts, isSig);
    attrs[key] = round1((attrs[key] || 0) + grids);
    spent = round1(spent + pts);
    gained[key] = grids;
  }
  return { attrs, spent, gained };
}

// ---------------------------------------------------------------------------
// §2.5 升階判定。永不降階。
// 規則：15 項屬性均值 ≥ 下一階段(stages[level]) 均值 → level+1（可連跳）。
// 另提供招牌屬性是否達標的資訊供 UI 展示。
// ---------------------------------------------------------------------------
export function checkLevelUp(charState, charTemplate) {
  let level = charState.level;
  const stages = charTemplate.stages; // [6][15]，0-indexed = 階1..階6
  let leveled = false;
  while (level < 6) {
    const target = stages[level]; // 下一階段（階 level+1）目標
    if (!target) break;
    const meanTarget = avg(target);
    const meanCurrent = avg(ATTR_KEYS.map((k) => charState.attrs[k] || 0));
    if (meanCurrent + 1e-9 >= meanTarget) {
      level += 1;
      leveled = true;
    } else break;
  }
  return { level: Math.max(level, charState.level), leveled };
}

// 角色對「下一階段」的進度（0–1），供 UI 進度條
export function levelProgress(charState, charTemplate) {
  const level = charState.level;
  if (level >= 6) return 1;
  const target = charTemplate.stages[level];
  if (!target) return 1;
  const meanTarget = avg(target);
  const prev = level >= 1 ? avg(charTemplate.stages[level - 1]) : 0;
  const meanCurrent = avg(ATTR_KEYS.map((k) => charState.attrs[k] || 0));
  if (meanTarget <= prev) return 1;
  return Math.min(1, Math.max(0, (meanCurrent - prev) / (meanTarget - prev)));
}

// ---------------------------------------------------------------------------
// §2.6 技能學習雙閘門
// ---------------------------------------------------------------------------
// 回傳 { state: 'learned'|'available'|'locked', reasons: string[], missing: [{attr,need,have}] }
export function skillStatus(skill, charState, skillPoints) {
  if (charState.learnedSkills?.includes(skill.id)) {
    return { state: 'learned', reasons: [], missing: [] };
  }
  const reasons = [];
  const missing = [];
  if (charState.level < skill.requiredStage) {
    reasons.push(`需階段 ${skill.requiredStage}（現 ${charState.level}）`);
  }
  for (const req of skill.attrRequirements || []) {
    const have = round1(charState.attrs[req.attr] || 0);
    if (have < req.min) {
      missing.push({ attr: req.attr, need: req.min, have });
    }
  }
  if (missing.length) reasons.push('屬性未達門檻');
  if ((skillPoints || 0) < skill.cost) {
    reasons.push(`技能點不足（需 ${skill.cost}）`);
  }
  return { state: reasons.length ? 'locked' : 'available', reasons, missing };
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------
export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayISO() {
  return isoDate(new Date());
}
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + (Number(b) || 0), 0) / arr.length;
}

// ---------------------------------------------------------------------------
// 自驗：心意幣驗證用例（《app開發指令》§2.4）必須得 8600🐱
//   ①+③連8天、②連3天、④連1天、當日210分 → 8600
// 在 dev 模式下於 console 輸出 pass/fail。
// ---------------------------------------------------------------------------
export function selfTest() {
  const res = computeCatCoins({ p1: 8, p2: 3, p3: 8, p4: 1 }, 210);
  const pass = res.total === 8600;
  const msg = `[engine selfTest] 心意幣驗證用例 = ${res.total}🐱 期望 8600 → ${pass ? 'PASS ✅' : 'FAIL ❌'}`;
  if (pass) console.log(msg);
  else console.error(msg, res);
  return pass;
}

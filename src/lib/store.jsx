// ===========================================================================
// 全域狀態與所有變更動作。元件透過 useGame() 取用。
// 所有會改動存檔的動作都在此集中：保證每次變更都持久化 + 半自動備份。
// ===========================================================================

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  loadTemplate, saveTemplate, loadSave, persistSave, pushBackup,
  createEmptySave, ensureCharStates, migrateSave,
} from './storage.js';
import {
  applyAllocation, checkLevelUp, blocksTotal, skillPointsFromTotal,
  computeStreaks, computeCatCoins, reachedBlocks, todayISO, selfTest,
} from './engine.js';

const GameCtx = createContext(null);
export const useGame = () => useContext(GameCtx);

let _toastId = 0;
let _uidN = 0;
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(_uidN++).toString(36)}`;

export function GameProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [template, setTemplate] = useState(null);
  const [save, setSave] = useState(null);
  const [toasts, setToasts] = useState([]);
  const saveRef = useRef(null);
  saveRef.current = save;

  // 啟動載入
  useEffect(() => {
    (async () => {
      selfTest(); // console 自驗心意幣用例
      const t = await loadTemplate();
      let s = await loadSave();
      if (!s) s = createEmptySave();
      s = migrateSave(s);
      if (t) s = ensureCharStates(t, s);
      setTemplate(t);
      setSave(s);
      if (s) await persistSave(s);
      setReady(true);
    })();
  }, []);

  const toast = useCallback((msg, type = 'info') => {
    const id = ++_toastId;
    setToasts((ts) => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), type === 'celebrate' ? 3200 : 2200);
  }, []);

  // 核心提交：寫存檔（可選備份）
  const commit = useCallback(async (next, { backup = false } = {}) => {
    const persisted = await persistSave(next);
    setSave(persisted);
    saveRef.current = persisted;
    if (backup && template) pushBackup(template, persisted);
    return persisted;
  }, [template]);

  // ---- 模板導入（覆蓋）。保留既有養成存檔。----
  const importTemplate = useCallback(async (newTemplate, importedSave = null) => {
    await saveTemplate(newTemplate);
    setTemplate(newTemplate);
    let s = importedSave || saveRef.current || createEmptySave();
    s = ensureCharStates(newTemplate, s);
    await commit(s, { backup: true });
    return true;
  }, [commit]);

  // ---- 完整還原（導入 bundle）----
  const restoreBundle = useCallback(async ({ template: t, save: s }) => {
    if (t) { await saveTemplate(t); setTemplate(t); }
    let next = s || saveRef.current || createEmptySave();
    if (t) next = ensureCharStates(t, next);
    await commit(next, { backup: true });
    return true;
  }, [commit]);

  // ---- 結算某日積分 ----（每日只結算一次；不綁定絕對「今天」，可結算昨天）
  const settleDay = useCallback(async (blocks, thresholds, date) => {
    const s = structuredClone(saveRef.current);
    const day = date || todayISO();
    // 已結算則拒絕（防重複入庫）
    if ((s.dailyLog || []).some((e) => e.date === day)) {
      toast('この日は計上済み', 'info');
      return null;
    }
    const total = blocksTotal(blocks);
    const skillPts = skillPointsFromTotal(total);
    const reached = reachedBlocks(blocks, thresholds);
    const streaks = computeStreaks(s.streakLog, day, reached);
    const cat = computeCatCoins(streaks, total);

    s.currency.points += total;
    s.currency.skillPoints += skillPts;
    s.currency.catCoins += cat.total;

    s.streakLog = (s.streakLog || []).filter((e) => e.date !== day);
    s.streakLog.push({ date: day, reached });
    s.dailyLog = (s.dailyLog || []).filter((e) => e.date !== day);
    s.dailyLog.push({ date: day, total, breakdown: { ...blocks }, skillPts, catCoins: cat.total });

    await commit(s, { backup: true });
    return { total, skillPts, catCoins: cat.total, catDetail: cat, streaks, reached, date: day };
  }, [commit, toast]);

  // ---- 投資積分 → 屬性（含升階）----
  const invest = useCallback(async (charId, alloc) => {
    const s = structuredClone(saveRef.current);
    const cs = s.characters[charId];
    const ct = template.characters.find((c) => c.id === charId);
    if (!cs || !ct) return null;
    const { attrs, spent } = applyAllocation(cs, ct, alloc);
    if (spent > s.currency.points + 1e-9) { toast('ポイント不足', 'info'); return null; }
    cs.attrs = attrs;
    s.currency.points = Math.round((s.currency.points - spent) * 10) / 10;
    const before = cs.level;
    const { level, leveled } = checkLevelUp(cs, ct);
    cs.level = level;
    await commit(s, { backup: leveled });
    if (leveled) toast(`🎉 ${ct.name} が段階 ${level} に到達！`, 'celebrate');
    return { spent, leveled, level, before };
  }, [commit, template, toast]);

  // ---- 學習技能 ----
  const learnSkill = useCallback(async (charId, skill) => {
    const s = structuredClone(saveRef.current);
    const cs = s.characters[charId];
    if (!cs) return false;
    if (s.currency.skillPoints < skill.cost) { toast('SP不足', 'info'); return false; }
    if (cs.learnedSkills.includes(skill.id)) return false;
    s.currency.skillPoints = Math.round((s.currency.skillPoints - skill.cost) * 10) / 10;
    cs.learnedSkills = [...cs.learnedSkills, skill.id];
    await commit(s, { backup: true });
    toast(`✨ 必殺技「${skill.name}」を習得！`, 'celebrate');
    return true;
  }, [commit, toast]);

  // ---- 統一分配（草稿一次提交）：屬性賦分 + 技能學習，可多角色 ----
  // attrDraft: { charId: { attrKey: points } } ; skillDraft: { charId: [skillId] }
  const commitAllocation = useCallback(async (attrDraft, skillDraft) => {
    const s = structuredClone(saveRef.current);
    let spentPoints = 0;
    let spentSkill = 0;
    const levelUps = [];
    // 先驗證總額
    for (const [charId, alloc] of Object.entries(attrDraft || {})) {
      const ct = template.characters.find((c) => c.id === charId);
      if (!ct) continue;
      const { spent } = applyAllocation(s.characters[charId], ct, alloc);
      spentPoints += spent;
    }
    for (const [charId, ids] of Object.entries(skillDraft || {})) {
      for (const sid of ids) {
        const sk = template.skills.find((k) => k.id === sid);
        if (sk && !s.characters[charId].learnedSkills.includes(sid)) spentSkill += sk.cost;
      }
    }
    spentPoints = Math.round(spentPoints * 10) / 10;
    spentSkill = Math.round(spentSkill * 10) / 10;
    if (spentPoints > s.currency.points + 1e-9) { toast('ポイント不足', 'info'); return null; }
    if (spentSkill > s.currency.skillPoints + 1e-9) { toast('SP不足', 'info'); return null; }

    // 套用屬性
    for (const [charId, alloc] of Object.entries(attrDraft || {})) {
      const ct = template.characters.find((c) => c.id === charId);
      if (!ct) continue;
      const cs = s.characters[charId];
      const { attrs } = applyAllocation(cs, ct, alloc);
      cs.attrs = attrs;
      const before = cs.level;
      const { level } = checkLevelUp(cs, ct);
      cs.level = level;
      if (level > before) levelUps.push({ name: ct.name, level });
    }
    // 套用技能
    for (const [charId, ids] of Object.entries(skillDraft || {})) {
      const cs = s.characters[charId];
      for (const sid of ids) {
        if (!cs.learnedSkills.includes(sid)) cs.learnedSkills = [...cs.learnedSkills, sid];
      }
    }
    s.currency.points = Math.round((s.currency.points - spentPoints) * 10) / 10;
    s.currency.skillPoints = Math.round((s.currency.skillPoints - spentSkill) * 10) / 10;
    await commit(s, { backup: true });
    if (levelUps.length) {
      levelUps.forEach((l) => toast(`🎉 ${l.name} が段階 ${l.level} に到達！`, 'celebrate'));
    } else if (spentPoints || spentSkill) {
      toast('✅ 配分を保存しました', 'celebrate');
    }
    return { spentPoints, spentSkill, levelUps };
  }, [commit, template, toast]);

  // ---- 公共記憶 / 角色動態（圖文 timeline）----
  const addTeamPost = useCallback(async (team, post) => {
    const s = structuredClone(saveRef.current);
    s.teamFeed[team] = [...(s.teamFeed[team] || []), { id: uid('tp'), date: todayISO(), ...post }];
    await commit(s);
  }, [commit]);
  const updateTeamPost = useCallback(async (team, id, patch) => {
    const s = structuredClone(saveRef.current);
    s.teamFeed[team] = (s.teamFeed[team] || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
    await commit(s);
  }, [commit]);
  const deleteTeamPost = useCallback(async (team, id) => {
    const s = structuredClone(saveRef.current);
    s.teamFeed[team] = (s.teamFeed[team] || []).filter((p) => p.id !== id);
    await commit(s);
  }, [commit]);

  const addCharPost = useCallback(async (charId, post) => {
    const s = structuredClone(saveRef.current);
    const cs = s.characters[charId];
    cs.memories = [...(cs.memories || []), { id: uid('cp'), date: todayISO(), ...post }];
    await commit(s);
  }, [commit]);
  const updateCharPost = useCallback(async (charId, id, patch) => {
    const s = structuredClone(saveRef.current);
    const cs = s.characters[charId];
    cs.memories = (cs.memories || []).map((p) => (p.id === id ? { ...p, ...patch } : p));
    await commit(s);
  }, [commit]);
  const deleteCharPost = useCallback(async (charId, id) => {
    const s = structuredClone(saveRef.current);
    const cs = s.characters[charId];
    cs.memories = (cs.memories || []).filter((p) => p.id !== id);
    await commit(s);
  }, [commit]);

  // ---- 貨架 ----
  const addShelf = useCallback(async (name) => {
    const s = structuredClone(saveRef.current);
    const n = (name || '').trim();
    if (n && !(s.shelves || []).includes(n)) s.shelves = [...(s.shelves || []), n];
    await commit(s);
  }, [commit]);
  const removeShelf = useCallback(async (name) => {
    const s = structuredClone(saveRef.current);
    s.shelves = (s.shelves || []).filter((x) => x !== name);
    await commit(s);
  }, [commit]);

  // ---- 商城 ----
  const addShopItem = useCallback(async (item) => {
    const s = structuredClone(saveRef.current);
    s.shop = [...(s.shop || []), { ...item, id: item.id || `item_${Date.now()}` }];
    await commit(s);
  }, [commit]);
  const updateShopItem = useCallback(async (id, patch) => {
    const s = structuredClone(saveRef.current);
    s.shop = (s.shop || []).map((it) => (it.id === id ? { ...it, ...patch } : it));
    await commit(s);
  }, [commit]);
  const removeShopItem = useCallback(async (id) => {
    const s = structuredClone(saveRef.current);
    s.shop = (s.shop || []).filter((it) => it.id !== id);
    await commit(s);
  }, [commit]);

  // ---- 贈禮 ----
  const giveGift = useCallback(async (charId, item, memo) => {
    const s = structuredClone(saveRef.current);
    if (s.currency.catCoins < item.price) { toast('にゃんコイン不足', 'info'); return false; }
    s.currency.catCoins -= item.price;
    const cs = s.characters[charId];
    cs.gifts = [...(cs.gifts || []), {
      itemId: item.id, itemName: item.name, image: item.image,
      date: todayISO(), memo: memo || '',
    }];
    await commit(s, { backup: true });
    toast('🎁 プレゼントを贈りました', 'celebrate');
    return true;
  }, [commit, toast]);

  // ---- 頭像 ----
  const setAvatar = useCallback(async (charId, dataUrl) => {
    const s = structuredClone(saveRef.current);
    s.characters[charId].customAvatar = dataUrl;
    await commit(s);
  }, [commit]);

  const value = {
    ready, template, save, toasts, toast,
    importTemplate, restoreBundle, settleDay, invest, learnSkill, commitAllocation,
    addShopItem, updateShopItem, removeShopItem, giveGift, setAvatar,
    addShelf, removeShelf,
    addTeamPost, updateTeamPost, deleteTeamPost,
    addCharPost, updateCharPost, deleteCharPost,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

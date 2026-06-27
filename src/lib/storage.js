// ===========================================================================
// 持久化層 — IndexedDB（透過 localForage）。
// 嚴格分離：靜態模板（template）與動態存檔（save）分開存儲、分開備份。
// 另含「半自動備份」：每次保存時靜默寫一份快照到 backup store（滾動保留 N 份）。
// ===========================================================================

import localforage from 'localforage';
import { ATTR_KEYS, APP_VERSION } from './constants.js';

const templateStore = localforage.createInstance({ name: 'yousei', storeName: 'template' });
const saveStore = localforage.createInstance({ name: 'yousei', storeName: 'save' });
const backupStore = localforage.createInstance({ name: 'yousei', storeName: 'backup' });

const TEMPLATE_KEY = 'staticTemplate';
const SAVE_KEY = 'saveState';
const MAX_BACKUPS = 15;

// ---------------------------------------------------------------------------
// 預設存檔
// ---------------------------------------------------------------------------
export function emptyAttrs() {
  return Object.fromEntries(ATTR_KEYS.map((k) => [k, 0]));
}

export function createEmptySave() {
  return {
    version: APP_VERSION,
    lastUpdated: new Date().toISOString(),
    currency: { points: 0, skillPoints: 0, catCoins: 0 },
    characters: {},
    shop: [],
    shelves: [],                                    // 小貓商城貨架（可新建空貨架）
    streakLog: [],
    dailyLog: [],
    teamFeed: { pink: [], blue: [], brown: [] },    // 公共記憶（圖文動態 timeline，各 Team 一條）
  };
}

export function emptyCharState(charId) {
  return {
    charId,
    level: 1,
    attrs: emptyAttrs(),
    learnedSkills: [],
    gifts: [],
    memories: [],   // 角色動態（圖文 timeline）
  };
}

// 舊存檔遷移：teamMemory(字串) → teamFeed(動態)，補 shelves / memories
export function migrateSave(save) {
  const s = { ...save };
  if (!s.shelves) s.shelves = [];
  if (!s.teamFeed) {
    s.teamFeed = { pink: [], blue: [], brown: [] };
    const old = save.teamMemory || {};
    for (const team of ['pink', 'blue', 'brown']) {
      const txt = (old[team] || '').trim();
      if (txt) s.teamFeed[team] = [{ id: `m_${team}_0`, date: (save.lastUpdated || '').slice(0, 10), text: txt, images: [] }];
    }
  }
  delete s.teamMemory;
  return s;
}

// 確保每個模板角色都有對應狀態（新導入角色補狀態，舊存檔不動）
export function ensureCharStates(template, save) {
  const next = { ...save };
  next.characters = { ...(save.characters || {}) };
  for (const c of template?.characters || []) {
    if (!next.characters[c.id]) {
      next.characters[c.id] = emptyCharState(c.id);
    } else {
      // 補齊可能缺失的屬性鍵
      const cs = { ...next.characters[c.id] };
      cs.attrs = { ...emptyAttrs(), ...cs.attrs };
      cs.learnedSkills = cs.learnedSkills || [];
      cs.gifts = cs.gifts || [];
      cs.memories = cs.memories || [];
      next.characters[c.id] = cs;
    }
  }
  if (!next.teamFeed) next.teamFeed = { pink: [], blue: [], brown: [] };
  if (!next.shelves) next.shelves = [];
  return next;
}

// ---------------------------------------------------------------------------
// 讀寫
// ---------------------------------------------------------------------------
export async function loadTemplate() {
  return (await templateStore.getItem(TEMPLATE_KEY)) || null;
}
export async function saveTemplate(template) {
  await templateStore.setItem(TEMPLATE_KEY, template);
}
export async function loadSave() {
  return (await saveStore.getItem(SAVE_KEY)) || null;
}
export async function persistSave(save) {
  const next = { ...save, lastUpdated: new Date().toISOString(), version: APP_VERSION };
  await saveStore.setItem(SAVE_KEY, next);
  return next;
}

// ---------------------------------------------------------------------------
// 半自動備份（靜默，存於 IndexedDB，不打擾使用者）
// ---------------------------------------------------------------------------
export async function pushBackup(template, save) {
  try {
    const ts = new Date().toISOString();
    const bundle = makeBundle(template, save);
    await backupStore.setItem(ts, bundle);
    // 滾動清理
    const keys = (await backupStore.keys()).sort();
    if (keys.length > MAX_BACKUPS) {
      for (const k of keys.slice(0, keys.length - MAX_BACKUPS)) {
        await backupStore.removeItem(k);
      }
    }
  } catch (e) {
    console.warn('自動備份失敗（不影響使用）', e);
  }
}
export async function listBackups() {
  const keys = (await backupStore.keys()).sort().reverse();
  return keys;
}
export async function getBackup(key) {
  return backupStore.getItem(key);
}

// ---------------------------------------------------------------------------
// 導出 / 導入 bundle（SaveState + 當前模板快照合成一檔）
// ---------------------------------------------------------------------------
export function makeBundle(template, save) {
  return {
    app: 'yousei',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    template,
    save,
  };
}

export function bundleToJson(template, save) {
  return JSON.stringify(makeBundle(template, save), null, 2);
}

// 清空全部（危險操作，UI 需二次確認）
export async function wipeAll() {
  await templateStore.clear();
  await saveStore.clear();
}

// ===========================================================================
// 導入解析器 — CSV（角色成長表 / 技能表）+ JSON（StaticTemplate 備份）。
// 嚴格按《app開發指令》§4 格式；容錯 BOM / CRLF / 全形 / 前後空白。
// 校驗失敗時指出「哪一行哪一欄」。
// ===========================================================================

import { ATTR_KEYS, ATTR_NAME_TO_KEY, ATTR_ORDER_CN, ATTR_LABELS } from './constants.js';

const TEAM_SET = new Set(['pink', 'blue', 'brown']);
const POS_SET = new Set(['D1', 'D2', 'S1', 'S2', 'S3']);

// 去 BOM、統一換行、全形數字/符號轉半形
function normalizeRaw(text) {
  let t = text.replace(/^﻿/, '');
  t = t.replace(/\r\n?/g, '\n');
  return t;
}
function normalizeCell(s) {
  if (s == null) return '';
  let v = String(s).trim();
  // 去除包裹引號
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    v = v.slice(1, -1).replace(/""/g, '"');
  }
  return v.trim();
}
// 全形數字 → 半形，並抽出數值
function toNum(s) {
  const half = String(s).replace(/[０-９．－]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace('．', '.');
  const n = Number(half.trim());
  return Number.isFinite(n) ? n : NaN;
}

// 解析一行 CSV（支援引號內逗號）
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i += 1; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = normalizeRaw(text).split('\n').filter((l) => l.trim() !== '');
  return lines.map(splitCsvLine);
}

// ---------------------------------------------------------------------------
// 角色成長表
// ---------------------------------------------------------------------------
export function parseCharactersCsv(text) {
  const errors = [];
  const warnings = [];
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { characters: [], errors: ['ファイルが空か、データ行がありません'], warnings };
  }
  const header = rows[0].map(normalizeCell);
  // 期望欄序：id,角色,战队,位置,成长类型,招牌属性,属性,阶1..阶6
  const expected = ['id', '角色', '战队', '位置', '成长类型', '招牌属性', '属性', '阶1', '阶2', '阶3', '阶4', '阶5', '阶6'];
  if (header.length < expected.length) {
    errors.push(`ヘッダー列が不足：必要 ${expected.length} 列（${expected.join(',')}）、実際 ${header.length} 列`);
  }

  // 按 id 分組，保留行號
  const groups = new Map(); // id → { meta, rows:[{attrKey, cnName, stages, line}] }
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r].map(normalizeCell);
    const line = r + 1; // 1-based，含表頭
    const [id, name, team, position, growthType, sigCn, attrCn] = cells;
    if (!id) { errors.push(`${line} 行目：id がありません`); continue; }
    const stageVals = cells.slice(7, 13).map(toNum);
    if (stageVals.some((v) => Number.isNaN(v))) {
      errors.push(`${line} 行目（${id} ${attrCn}）：段1〜段6 に数値以外`);
    }
    const attrKey = ATTR_NAME_TO_KEY[attrCn];
    if (!attrKey) {
      errors.push(`${line} 行目：属性名「${attrCn}」を認識できません`);
    }
    if (!groups.has(id)) {
      // 招牌屬性英文 key（招牌属性欄已是英文 key）
      let sigKey = sigCn;
      if (!ATTR_KEYS.includes(sigKey)) {
        // 容錯：若填了中文，嘗試映射
        sigKey = ATTR_NAME_TO_KEY[sigCn] || sigKey;
      }
      groups.set(id, {
        meta: { id, name, team, position, growthType, signatureAttr: sigKey, firstLine: line },
        rows: [],
      });
    }
    groups.get(id).rows.push({ attrKey, cnName: attrCn, stages: stageVals, line });
  }

  const characters = [];
  for (const [id, g] of groups) {
    const m = g.meta;
    // 戰隊 / 位置 校驗
    if (!TEAM_SET.has(m.team)) errors.push(`キャラ ${id}（${m.firstLine} 行目）：チーム「${m.team}」が不正（pink/blue/brown）`);
    if (!POS_SET.has(m.position)) errors.push(`キャラ ${id}（${m.firstLine} 行目）：ポジション「${m.position}」が不正（D1/D2/S1/S2/S3）`);
    if (!ATTR_KEYS.includes(m.signatureAttr)) errors.push(`キャラ ${id}：得意属性「${m.signatureAttr}」を認識できません`);
    // 屬性行數
    if (g.rows.length !== 15) {
      errors.push(`キャラ ${id}（${m.name}）：属性の行数 ${g.rows.length}、15 行必要（順序：${ATTR_ORDER_CN.join('→')}）`);
    }
    // 組裝 stages[6][15]，按 ATTR_KEYS 順序
    const byKey = {};
    for (const row of g.rows) {
      if (!row.attrKey) continue;
      if (byKey[row.attrKey]) {
        warnings.push(`キャラ ${id}：属性「${row.cnName}」が重複（${row.line} 行目）`);
      }
      byKey[row.attrKey] = row;
      // 阶1 必為 0
      if (Number(row.stages[0]) !== 0) {
        errors.push(`${row.line} 行目（${id} ${row.cnName}）：段1 は 0 のはず、実際 ${row.stages[0]}`);
      }
    }
    const stages = [[], [], [], [], [], []];
    for (let s = 0; s < 6; s += 1) {
      for (const key of ATTR_KEYS) {
        const row = byKey[key];
        stages[s].push(row ? Number(row.stages[s]) || 0 : 0);
        if (!row) {
          // 缺該屬性
        }
      }
    }
    // 缺屬性檢查
    for (const key of ATTR_KEYS) {
      if (!byKey[key]) errors.push(`キャラ ${id}（${m.name}）：属性「${ATTR_LABELS[key]}」がありません`);
    }
    // 招牌屬性  段6 = 100
    const sigRow = byKey[m.signatureAttr];
    if (sigRow && Number(sigRow.stages[5]) !== 100) {
      warnings.push(`キャラ ${id}：得意属性 ${ATTR_LABELS[m.signatureAttr] || m.signatureAttr}  段6 = ${sigRow.stages[5]}（推奨 100）`);
    }
    characters.push({
      id,
      name: m.name,
      team: m.team,
      position: m.position,
      growthType: m.growthType,
      signatureAttr: m.signatureAttr,
      stages,
    });
  }

  return { characters, errors, warnings };
}

// ---------------------------------------------------------------------------
// 技能表
// ---------------------------------------------------------------------------
export function parseSkillsCsv(text, knownCharIds) {
  const errors = [];
  const warnings = [];
  const rows = parseCsv(text);
  if (rows.length < 2) return { skills: [], errors: ['技ファイルが空か、データ行がありません'], warnings };

  const skills = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r].map(normalizeCell);
    const line = r + 1;
    const [id, charId, name, difficulty, reqStageRaw, costRaw, thresholdRaw] = cells;
    if (!id) { errors.push(`技 ${line} 行目：id がありません`); continue; }
    if (knownCharIds && knownCharIds.size && !knownCharIds.has(charId)) {
      errors.push(`技 ${line} 行目（${id}）：charId「${charId}」がどのキャラにも対応しません`);
    }
    const requiredStage = toNum(reqStageRaw);
    if (Number.isNaN(requiredStage) || requiredStage < 2 || requiredStage > 6) {
      warnings.push(`技 ${line} 行目（${id}）：必要段階「${reqStageRaw}」は 2〜6 のはず`);
    }
    const cost = toNum(costRaw);
    if (Number.isNaN(cost)) errors.push(`技 ${line} 行目（${id}）：スキルポイント「${costRaw}」が数値ではありません`);

    // 屬性門檻：以 ; 分隔，每項「中文≥數值」
    const attrRequirements = [];
    const normTh = String(thresholdRaw || '')
      .replace(/[；]/g, ';')
      .replace(/[≧⩾]/g, '≥')
      .replace(/>=/g, '≥');
    for (const tokenRaw of normTh.split(';')) {
      const token = tokenRaw.trim();
      if (!token) continue;
      const idx = token.indexOf('≥');
      if (idx < 0) { errors.push(`技 ${line} 行目（${id}）：条件「${token}」に ≥ がありません`); continue; }
      const attrCn = token.slice(0, idx).trim();
      const min = toNum(token.slice(idx + 1));
      const attrKey = ATTR_NAME_TO_KEY[attrCn];
      if (!attrKey) { errors.push(`技 ${line} 行目（${id}）：条件属性「${attrCn}」を変換できません`); continue; }
      if (Number.isNaN(min)) { errors.push(`技 ${line} 行目（${id}）：条件「${token}」の数値が不正`); continue; }
      attrRequirements.push({ attr: attrKey, min });
    }
    skills.push({
      id,
      charId,
      name,
      difficulty,
      requiredStage: Number.isNaN(requiredStage) ? 2 : requiredStage,
      cost: Number.isNaN(cost) ? 0 : cost,
      attrRequirements,
    });
  }
  return { skills, errors, warnings };
}

// 由角色的招牌屬性反推天賦對照表（§4.3 推薦做法）
export function buildTalents(characters) {
  const talents = {};
  for (const key of ATTR_KEYS) talents[key] = [];
  for (const c of characters) {
    if (talents[c.signatureAttr]) talents[c.signatureAttr].push(c.id);
  }
  return talents;
}

// 整合：由兩個 CSV 文字組裝 StaticTemplate + 校驗報告
export function buildTemplateFromCsv(charsText, skillsText) {
  const cRes = parseCharactersCsv(charsText);
  const charIds = new Set(cRes.characters.map((c) => c.id));
  const sRes = skillsText ? parseSkillsCsv(skillsText, charIds) : { skills: [], errors: [], warnings: [] };
  const template = {
    characters: cRes.characters,
    skills: sRes.skills,
    talents: buildTalents(cRes.characters),
  };
  return {
    template,
    errors: [...cRes.errors, ...sRes.errors],
    warnings: [...cRes.warnings, ...sRes.warnings],
    stats: { characters: cRes.characters.length, skills: sRes.skills.length },
  };
}

// JSON 導入（StaticTemplate 或含 save 的完整備份）。回傳 { template, save }
export function parseJsonImport(text) {
  const data = JSON.parse(text);
  // 完整備份格式：{ template, save } 或 { staticTemplate, saveState }
  const template = data.template || data.staticTemplate || (data.characters ? data : null);
  const save = data.save || data.saveState || null;
  if (!template || !Array.isArray(template.characters)) {
    throw new Error('JSON 形式を認識できません：characters 配列がありません');
  }
  if (!template.talents) template.talents = buildTalents(template.characters);
  return { template, save };
}

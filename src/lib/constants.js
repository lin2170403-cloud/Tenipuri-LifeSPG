// ===========================================================================
// 固定常量 — 属性キー、グループ、ラベル、名称マッピング、チーム設定、採点ルール。
// ここには「エンジン定数」のみ。キャラ/技/成長データは一切持たない（全て導入ファイルから）。
// ===========================================================================

// 15 項目の属性キーと順序（attrIndex 0–14）
export const ATTR_KEYS = [
  // A フィジカル
  'speed', 'power', 'stamina', 'agility', 'stability',
  // B メンタル
  'spirit', 'strategy', 'ballSense', 'evolution', 'coordination',
  // C テクニック
  'serve', 'stroke', 'volley', 'slice', 'spin',
];

export const ATTR_GROUPS = {
  A: { label: 'フィジカル', keys: ['speed', 'power', 'stamina', 'agility', 'stability'] },
  B: { label: 'メンタル', keys: ['spirit', 'strategy', 'ballSense', 'evolution', 'coordination'] },
  C: { label: 'テクニック', keys: ['serve', 'stroke', 'volley', 'slice', 'spin'] },
};

// レーダーチャートは A / B / C の 3 グループ × 5 軸で描画
export const ATTR_GROUP_LIST = [
  { id: 'A', ...ATTR_GROUPS.A },
  { id: 'B', ...ATTR_GROUPS.B },
  { id: 'C', ...ATTR_GROUPS.C },
];

export const ATTR_LABELS = {
  speed: 'スピード', power: 'パワー', stamina: 'スタミナ', agility: '敏捷', stability: '安定',
  spirit: '精神', strategy: '戦略', ballSense: '球感', evolution: '進化', coordination: '協調',
  serve: 'サーブ', stroke: 'ストローク', volley: 'ボレー', slice: 'スライス', spin: 'スピン',
};

// レーダー軸用の短いラベル
export const ATTR_LABELS_SHORT = { ...ATTR_LABELS };

// 属性名（日本語＋旧中国語の各表記）→ attrKey。CSV キャラ表・技条件で共用。
export const ATTR_NAME_TO_KEY = (() => {
  const m = {};
  const add = (key, ...names) => names.forEach((n) => { m[n] = key; });
  add('speed', 'スピード', '速度');
  add('power', 'パワー', '爆發', '爆发');
  add('stamina', 'スタミナ', '耐力');
  add('agility', '敏捷', '靈活', '灵活');
  add('stability', '安定', '穩定', '稳定');
  add('spirit', '精神');
  add('strategy', '戦略', '策略');
  add('ballSense', '球感', 'ボールセンス');
  add('evolution', '進化', '进化');
  add('coordination', '協調', '协调');
  add('serve', 'サーブ', '發球', '发球', '接發', '接发', '發球/接發');
  add('stroke', 'ストローク', '正反手', '正手反手', '正手/反手', '正手', '反手');
  add('volley', 'ボレー', '截擊', '截击', '截擊/網前', '網前', '网前');
  add('slice', 'スライス', '削放挑', '削球/放短/挑高', '削球放短挑高', '削球');
  add('spin', 'スピン', '旋轉落點', '旋转落点', '旋轉/落點控制', '旋轉', '落點');
  return m;
})();

// キャラ表「属性」欄の 15 項目（標準順序、検証メッセージ用）
export const ATTR_ORDER_CN = ['スピード', 'パワー', 'スタミナ', '敏捷', '安定', '精神', '戦略', '球感', '進化', '協調', 'サーブ', 'ストローク', 'ボレー', 'スライス', 'スピン'];

// チーム設定（色は UI 設定で固定化可。所属とポジションは導入データから読む）
// 🩷🩵🤎 に寄せた淡く爽やかな配色
export const TEAMS = {
  pink: { id: 'pink', emoji: '🩷', label: 'ピンク', color: '#ef8fb3', soft: '#fce9f0', deep: '#c05d82' },
  blue: { id: 'blue', emoji: '🩵', label: 'ブルー', color: '#7cc3e6', soft: '#e6f3fb', deep: '#3d84aa' },
  brown: { id: 'brown', emoji: '🤎', label: 'ブラウン', color: '#b97e51', soft: '#f1e7da', deep: '#7c5430' },
};
export const TEAM_ORDER = ['pink', 'blue', 'brown'];

export const POSITION_ORDER = ['D1', 'D2', 'S1', 'S2', 'S3'];

// 技の難度配色 / 並び順
export const DIFFICULTY = {
  中級: { rank: 1, color: '#64748b', label: '中級' },
  上級: { rank: 2, color: '#0891b2', label: '上級' },
  超級: { rank: 3, color: '#7c3aed', label: '超級' },
  奥義: { rank: 4, color: '#db2777', label: '奥義' },
  神域: { rank: 5, color: '#d97706', label: '神域' },
};

// 4 ブロック定義（目標値 + 単項倍率）
export const BLOCKS = [
  { key: 'p1', label: '① 記録', target: 10, mult: 1 },
  { key: 'p2', label: '② 生活', target: 50, mult: 2 },
  { key: 'p3', label: '③ 仕事', target: 60, mult: 5 },
  { key: 'p4', label: '④ 家事', target: 20, mult: 2 },
];

export const RATES = {
  pointToGrid: 1, // 1 ポイント = 1 属性マス
  signatureMultiplier: 1.5, // 得意属性 ×1.5 成長
  skillPointRate: 0.4, // スキルポイント = ポイント × 0.4
  catBonusThreshold: 180, // 当日合計 > 180 → +3000🐱
  catBonus: 3000,
};

// 家事項目。各項目に 定刻(満点)/猶予(半分)/大掃除(1/4) の三態。
export const CHORE_ITEMS = [
  { id: 'window', name: '換気', score: 1 },
  { id: 'dishes', name: '食器洗い・コンロ拭き', score: 5 },
  { id: 'underwear', name: '下着洗い', score: 5 },
  { id: 'surface', name: '床・机を清潔に', score: 3 },
  { id: 'trash', name: 'ゴミ出し', score: 3 },
  { id: 'vacuum', name: '掃除機', score: 3 },
  { id: 'clothes', name: '衣類・ぬいぐるみ洗い', score: 5 },
  { id: 'toilet', name: 'トイレ掃除', score: 3 },
  { id: 'mop', name: '床拭き', score: 10 },
  { id: 'sheets', name: 'シーツ交換', score: 10 },
  { id: 'fridge', name: '冷蔵庫・レンジ内清掃', score: 10 },
  { id: 'sinknet', name: '排水ネット交換', score: 5 },
  { id: 'sinkdeep', name: '排水口の徹底清掃', score: 10 },
  { id: 'socks', name: '靴下洗い', score: 5 },
  { id: 'sponge', name: 'メイクスポンジ洗い・乾燥', score: 3 },
  { id: 'other', name: 'その他', score: 4 },
];

// 家事の三態係数（定刻=満点 / 猶予=半分 / 大掃除=1/4）
export const CHORE_STATES = { ontime: 1, buffer: 0.5, deepclean: 0.25 };

export const APP_VERSION = '1.0.0';

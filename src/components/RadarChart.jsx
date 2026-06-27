// 五維雷達圖（純 SVG）— 大尺寸。實線=當前值，虛線=當前階段目標。招牌軸標★。
import { ATTR_LABELS_SHORT } from '../lib/constants.js';

const MAX = 100;

export default function RadarChart({ keys, current, target, signatureAttr, accent = '#c47d8e' }) {
  const W = 336, H = 288;
  const cx = W / 2, cy = 144, R = 102, labelR = R + 13;
  const n = keys.length;
  const ang = (i) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i, v) => {
    const r = R * Math.max(0, Math.min(1, (Number(v) || 0) / MAX));
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).join(',')).join(' ');

  const cur = keys.map((k) => current[k] || 0);
  const tgt = keys.map((k, i) => (Array.isArray(target) ? target[i] : target[k]) || 0);
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    keys.map((_, i) => [cx + R * f * Math.cos(ang(i)), cy + R * f * Math.sin(ang(i))].join(',')).join(' '));

  return (
    <svg className="radar-svg" viewBox={`0 0 ${W} ${H}`} width="100%">
      {rings.map((p, i) => (
        <polygon key={i} points={p} fill={i === 3 ? 'rgba(0,0,0,0.012)' : 'none'} stroke="#dcd5cb" strokeWidth="1" />
      ))}
      {keys.map((k, i) => {
        const [x, y] = pt(i, MAX);
        return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#dcd5cb" strokeWidth="1" />;
      })}
      {/* 招牌屬性：只在最外圈標一個小三角，不畫滿格線，避免與實際數值混淆 */}
      {keys.map((k, i) => {
        if (k !== signatureAttr) return null;
        const [x, y] = pt(i, MAX);
        const a = ang(i);
        const ox = cx + (R + 5) * Math.cos(a);
        const oy = cy + (R + 5) * Math.sin(a);
        return <circle key={`s${i}`} cx={ox} cy={oy} r="3.2" fill={accent} stroke="#fff" strokeWidth="1" />;
      })}
      <polygon points={poly(tgt)} fill="none" stroke="#9aa6a0" strokeWidth="1.6" strokeDasharray="4 3" />
      <polygon points={poly(cur)} fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="2.6" strokeLinejoin="round" />
      {cur.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="3" fill={accent} />; })}
      {keys.map((k, i) => {
        const a = ang(i);
        const x = cx + labelR * Math.cos(a);
        const y = cy + labelR * Math.sin(a);
        const sig = k === signatureAttr;
        const anchor = Math.abs(Math.cos(a)) < 0.34 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
        const dy = Math.sin(a) < -0.5 ? -2 : Math.sin(a) > 0.5 ? 11 : 4;
        return (
          <text key={k} x={x} y={y + dy} textAnchor={anchor} fontSize="12" fontWeight={sig ? 800 : 600}
            fill={sig ? accent : '#6c6359'}>
            {ATTR_LABELS_SHORT[k]}{sig ? ' ★' : ''}
          </text>
        );
      })}
    </svg>
  );
}

// 禮物區：贈送入口 + 甜蜜記憶時間軸
import { useState } from 'react';
import Modal from './Modal.jsx';
import { useGame } from '../lib/store.jsx';

export default function GiftArea({ char, charState }) {
  const { save } = useGame();
  const [giving, setGiving] = useState(false);
  const gifts = [...(charState.gifts || [])].reverse();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mini-lab">🐱 残高 {save.currency.catCoins}</span>
        <button className="btn sm gold" onClick={() => setGiving(true)}>🎁 プレゼントを贈る</button>
      </div>

      {gifts.length === 0 ? (
        <div className="empty" style={{ padding: '20px' }}>まだプレゼントを贈っていません</div>
      ) : (
        <div className="gift-timeline">
          {gifts.map((g, i) => (
            <div className="gift-item" key={i}>
              <div className="g-img">{g.image ? <img src={g.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} /> : '🎁'}</div>
              <div style={{ flex: 1 }}>
                <div className="g-name">{g.itemName}</div>
                <div className="g-date">{g.date}</div>
                {g.memo && <div className="g-memo">「{g.memo}」</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {giving && <GiftDialog char={char} onClose={() => setGiving(false)} />}
    </>
  );
}

function GiftDialog({ char, onClose }) {
  const { save, giveGift } = useGame();
  const shop = save.shop || [];
  const [sel, setSel] = useState(null);
  const [memo, setMemo] = useState('');
  const item = shop.find((s) => s.id === sel);
  const canAfford = item && save.currency.catCoins >= item.price;

  const submit = async () => {
    if (!item || !canAfford) return;
    const ok = await giveGift(char.id, item, memo);
    if (ok) onClose();
  };

  return (
    <Modal title={`${char.name} にプレゼント`} onClose={onClose}>
      <div className="note">🐱 残高 <b className="hl">{save.currency.catCoins}</b></div>
      {shop.length === 0 ? (
        <div className="empty">ショップに商品がありません。<br />「設定 → ショップ」で追加してください。</div>
      ) : (
        <>
          <div className="shop-grid" style={{ marginTop: 12 }}>
            {shop.map((it) => (
              <button key={it.id} className="shop-card" onClick={() => setSel(it.id)}
                style={{ textAlign: 'left', padding: 0, border: sel === it.id ? '2px solid var(--accent)' : undefined }}>
                <div className="ph">{it.image ? <img src={it.image} alt="" /> : '🎁'}</div>
                <div className="body">
                  <div className="nm">{it.name}</div>
                  <div className="pr">🐱 {it.price}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>思い出メモ（任意）</label>
            <textarea className="input" value={memo} onChange={(e) => setMemo(e.target.value)}
              placeholder="このプレゼントの物語を…" />
          </div>
          <button className="btn block gold" disabled={!item || !canAfford} onClick={submit}>
            {!item ? 'プレゼントを選択' : !canAfford ? 'にゃんコイン不足' : `贈る（🐱${item.price}）`}
          </button>
        </>
      )}
    </Modal>
  );
}

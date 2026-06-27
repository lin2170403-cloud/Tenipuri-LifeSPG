// 小貓商城管理：新建貨架 + 新增商品（導入圖 / 名稱 / 選貨架 / 價格🐱）+ 商品列表（刪除）
import { useState, useRef } from 'react';
import { useGame } from '../lib/store.jsx';

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export default function ShopManager() {
  const { save, addShopItem, removeShopItem, addShelf, removeShelf } = useGame();
  const shop = save.shop || [];
  // 貨架 = 顯式建立的 ∪ 商品上已用的
  const shelves = [...new Set([...(save.shelves || []), ...shop.map((s) => s.shelf).filter(Boolean)])];

  const [newShelf, setNewShelf] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [shelf, setShelf] = useState('');
  const [image, setImage] = useState(null);
  const fileRef = useRef(null);

  const createShelf = async () => {
    const n = newShelf.trim();
    if (!n) return;
    await addShelf(n);
    setShelf(n);
    setNewShelf('');
  };
  const pickImg = async (e) => { const f = e.target.files?.[0]; if (f) setImage(await fileToDataUrl(f)); };
  const add = async () => {
    const finalShelf = shelf || shelves[0] || '未分類';
    if (!name.trim() || !(Number(price) > 0)) return;
    await addShopItem({ name: name.trim(), price: Number(price), shelf: finalShelf, image });
    setName(''); setPrice(''); setImage(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>ショップ管理</div>

      {/* 棚を追加 */}
      <label className="mini-lab" style={{ fontWeight: 700 }}>棚</label>
      <div className="shelf-make" style={{ marginTop: 5 }}>
        <input className="input" value={newShelf} onChange={(e) => setNewShelf(e.target.value)} placeholder="新しい棚名（例：シューズ / アクセ / 限定）" />
        <button className="btn sm" onClick={createShelf} disabled={!newShelf.trim()}>＋ 棚を追加</button>
      </div>
      {shelves.length > 0 && (
        <div className="reached" style={{ marginTop: 2 }}>
          {shelves.map((s) => (
            <span key={s} className="pill" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {s}<button onClick={() => removeShelf(s)} style={{ border: 'none', background: 'none', color: 'var(--bad)', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}

      <hr className="divider" />

      {/* 新增商品 */}
      <div className="field">
        <label>商品画像（任意）</label>
        <input ref={fileRef} className="input" type="file" accept="image/*" onChange={pickImg} />
        {image && <img src={image} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 10, marginTop: 6 }} />}
      </div>
      <div className="row2">
        <div className="field"><label>商品名</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：限定シューズ" /></div>
        <div className="field"><label>価格 🐱</label><input className="input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
      </div>
      <div className="field">
        <label>棚に入れる</label>
        <select className="input" value={shelf} onChange={(e) => setShelf(e.target.value)}>
          {shelves.length === 0 && <option value="">（先に棚を追加）</option>}
          {shelves.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <button className="btn block" onClick={add} disabled={!name.trim() || !(Number(price) > 0)}>＋ 商品を追加</button>

      {/* リスト */}
      {shop.length > 0 && (
        <>
          <div className="section-title">出品中（{shop.length}）</div>
          {shelves.filter((sh) => shop.some((s) => s.shelf === sh)).map((sh) => (
            <div key={sh} style={{ marginBottom: 12 }}>
              <div className="mini-lab" style={{ fontWeight: 800, marginBottom: 5 }}>{sh}</div>
              <div className="shop-grid">
                {shop.filter((s) => s.shelf === sh).map((it) => (
                  <div className="shop-card" key={it.id}>
                    <div className="ph">{it.image ? <img src={it.image} alt="" /> : '🎁'}</div>
                    <div className="body">
                      <div className="nm">{it.name}</div>
                      <div className="pr">🐱 {it.price}</div>
                      <button className="btn sm ghost" style={{ marginTop: 6, width: '100%' }} onClick={() => removeShopItem(it.id)}>削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

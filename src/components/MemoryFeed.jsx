// 圖文動態 timeline：發布(文字+多圖) → 形成 timeline，可編輯/刪除，縮略圖點擊放大。
// 公共記憶與角色記憶共用此元件。
import { useState, useRef } from 'react';
import Lightbox from './Lightbox.jsx';

const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export default function MemoryFeed({ posts = [], onAdd, onUpdate, onDelete, placeholder = '寫下此刻…' }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [editing, setEditing] = useState(null); // post id or null
  const [zoom, setZoom] = useState(null);
  const fileRef = useRef(null);

  const reset = () => { setText(''); setImages([]); setEditing(null); };

  const pickImgs = async (e) => {
    const files = [...(e.target.files || [])];
    const urls = await Promise.all(files.map(fileToDataUrl));
    setImages((p) => [...p, ...urls]);
    e.target.value = '';
  };

  const publish = async () => {
    if (!text.trim() && images.length === 0) return;
    if (editing) await onUpdate(editing, { text: text.trim(), images });
    else await onAdd({ text: text.trim(), images });
    reset();
  };

  const startEdit = (p) => { setEditing(p.id); setText(p.text || ''); setImages(p.images || []); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const ordered = [...posts].reverse();

  return (
    <div>
      {/* 發布器 */}
      <div className="composer">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
        <div className="c-row">
          <div className="c-imgs">
            {images.map((src, i) => (
              <div className="mini" key={i}>
                <img src={src} alt="" />
                <button className="x" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <button className="add-img" onClick={() => fileRef.current?.click()}>＋</button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickImgs} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {editing && <button className="btn ghost sm" onClick={reset}>キャンセル</button>}
            <button className="btn sm" onClick={publish} disabled={!text.trim() && images.length === 0}>
              {editing ? '更新' : '投稿'}
            </button>
          </div>
        </div>
      </div>

      {/* timeline */}
      {ordered.length === 0 ? (
        <div className="empty" style={{ padding: '24px' }}>まだ投稿がありません。最初の一件を投稿しましょう</div>
      ) : (
        <div className="feed" style={{ marginTop: 12 }}>
          {ordered.map((p) => (
            <div className="post" key={p.id}>
              <div className="p-top">
                <span className="p-date">{p.date}</span>
                <div className="p-acts">
                  <button onClick={() => startEdit(p)}>編集</button>
                  <button onClick={() => onDelete(p.id)}>削除</button>
                </div>
              </div>
              {p.text && <div className="p-text">{p.text}</div>}
              {p.images?.length > 0 && (
                <div className="post-images">
                  {p.images.map((src, i) => (
                    <img className="thumb" key={i} src={src} alt="" onClick={() => setZoom(src)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}

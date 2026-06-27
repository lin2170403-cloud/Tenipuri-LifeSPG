// 圖片放大查看：點縮略圖開啟，點任意處關閉
export default function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

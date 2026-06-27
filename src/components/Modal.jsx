export default function Modal({ title, onClose, children, wide, full }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={'modal' + (full ? ' full' : '')} style={wide ? { maxWidth: 720 } : undefined} onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="關閉">×</button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

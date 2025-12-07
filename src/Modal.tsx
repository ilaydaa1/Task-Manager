// Modal.tsx
import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
};

export default function Modal({ open, title, onClose, children, footer, width = 520 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={backdrop} onMouseDown={onClose}>
      <div style={{ ...sheet, width }} onMouseDown={(e) => e.stopPropagation()}>
        {title && <div style={hdr}><strong>{title}</strong><button onClick={onClose} style={xbtn}>✕</button></div>}
        <div style={{ padding: 16 }}>{children}</div>
        {footer && <div style={ftr}>{footer}</div>}
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
  display: "grid", placeItems: "center", zIndex: 50
};
const sheet: React.CSSProperties = {
  background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  overflow: "hidden", maxWidth: "90vw"
};
const hdr: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "12px 16px", borderBottom: "1px solid #eee", background: "#fafafa"
};
const xbtn: React.CSSProperties = {
  border: "none", background: "transparent", fontSize: 18, cursor: "pointer", lineHeight: 1
};
const ftr: React.CSSProperties = {
  padding: 12, borderTop: "1px solid #eee", display: "flex", gap: 8, justifyContent: "flex-end"
};

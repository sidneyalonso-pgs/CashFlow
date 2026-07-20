"use client";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-ps-navy-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="modal-panel bg-white rounded-ps shadow-ps-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ps-ink">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-ps-muted hover:text-ps-ink transition-colors">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

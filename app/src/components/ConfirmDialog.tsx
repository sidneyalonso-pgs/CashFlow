"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  detail,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = tone === "danger";
  const iconWrap = isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
  const confirmBtn = isDanger
    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
    : "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ps-navy-900/60 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-white rounded-ps shadow-ps-lg border border-ps-navy/5 overflow-hidden"
      >
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full grid place-items-center ${iconWrap}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="confirm-title" className="text-base font-bold text-ps-ink leading-snug">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-ps-ink-2 leading-relaxed">{message}</p>
              {detail && (
                <p className="mt-3 text-sm font-medium text-ps-ink bg-ps-bg-2 border border-ps-navy/5 rounded-ps-sm px-3 py-2 break-words">
                  {detail}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 bg-ps-bg-2/60 border-t border-ps-navy/5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-ps-sm border border-ps-navy/15 text-ps-ink bg-white hover:bg-ps-bg-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ps-navy/30"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-ps-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

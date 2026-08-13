"use client";

import { useState } from "react";

export function CollapsiblePanel({
  title,
  right,
  defaultOpen = true,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs uppercase tracking-wide text-ps-muted font-semibold">{title}</span>
        <span className="flex items-center gap-3">
          {right}
          <span className={`inline-block text-ps-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        </span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

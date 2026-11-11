"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ícone "i" que abre uma explicação curta ao clicar. Serve para tirar texto fixo da tela:
 * o aviso fica a um clique, em vez de ocupar linhas o tempo todo.
 * Fecha ao clicar fora, ao apertar Esc ou ao clicar de novo no ícone.
 */
export function InfoTip({
  children,
  label = "Mais informações",
  align = "left",
}: {
  children: React.ReactNode;
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle print:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-grid place-items-center w-[18px] h-[18px] rounded-full border text-[11px] font-semibold italic leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ps-green ${
          open
            ? "bg-ps-navy text-white border-ps-navy"
            : "border-ps-muted/50 text-ps-muted hover:text-ps-ink hover:border-ps-ink"
        }`}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full mt-2 z-30 w-72 max-w-[80vw] rounded-ps-sm border border-ps-navy/10 bg-white p-3 text-left text-xs font-normal normal-case not-italic tracking-normal leading-relaxed text-ps-ink-2 shadow-ps ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}

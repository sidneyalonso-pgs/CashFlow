"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalcularProjecaoCentral } from "./actions";

export function ProjecaoButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pend}
        onClick={() =>
          start(async () => {
            const r = await recalcularProjecaoCentral(companyId);
            setMsg(r.error ?? "Projeção refeita até dezembro.");
            router.refresh();
          })
        }
        className="bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors disabled:opacity-60"
      >
        {pend ? "Refazendo..." : "Refazer projeção"}
      </button>
      {msg && <span className="text-xs text-ps-muted">{msg}</span>}
    </span>
  );
}

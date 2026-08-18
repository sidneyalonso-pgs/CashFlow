"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vincularIntercompany, desvincularIntercompany } from "./actions";

type Perna = { tabela: string; id: string };

export function VincularButton({ a, b }: { a: Perna; b: Perna }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const res = await vincularIntercompany(a, b);
            if (res.error) { setErro(res.error); return; }
            router.refresh();
          })
        }
        className="bg-ps-navy text-white text-xs font-semibold rounded-ps-sm px-3 py-1.5 hover:bg-ps-navy/90 disabled:opacity-60 transition-colors whitespace-nowrap"
      >
        {pendente ? "..." : "Vincular par"}
      </button>
      {erro && <span className="text-[11px] text-red-600 max-w-[220px] text-right">{erro}</span>}
    </div>
  );
}

export function DesvincularButton({ ref: refValor }: { ref: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          await desvincularIntercompany(refValor);
          router.refresh();
        })
      }
      className="text-xs text-ps-muted underline hover:text-ps-ink disabled:opacity-60 whitespace-nowrap"
    >
      {pendente ? "..." : "Desfazer vínculo"}
    </button>
  );
}

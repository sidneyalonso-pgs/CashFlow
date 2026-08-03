"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { baixarNotaDebito, cancelarNotaDebito } from "../../actions";

export function NDActions({ ndId, status }: { ndId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dataPgto, setDataPgto] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState<string | null>(null);

  if (status !== "Pendente") return null;

  function handleBaixar() {
    startTransition(async () => {
      const res = await baixarNotaDebito(ndId, dataPgto);
      if (res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  function handleCancelar() {
    if (!confirm("Cancelar esta nota de débito?")) return;
    startTransition(async () => {
      await cancelarNotaDebito(ndId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-ps-navy/5 pt-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <label className="block text-xs text-ps-muted mb-1">Data de pagamento</label>
        <input
          type="date"
          value={dataPgto}
          onChange={e => setDataPgto(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm bg-white"
        />
      </div>
      <button
        onClick={handleBaixar}
        disabled={isPending}
        className="w-full bg-ps-green text-ps-navy text-sm font-bold rounded-ps-sm py-2 hover:bg-ps-green/90 disabled:opacity-60 transition-colors"
      >
        {isPending ? "..." : "✓ Dar baixa (pago)"}
      </button>
      <button
        onClick={handleCancelar}
        disabled={isPending}
        className="w-full bg-red-50 text-red-700 text-sm font-medium rounded-ps-sm py-1.5 hover:bg-red-100 disabled:opacity-60 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

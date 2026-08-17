"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { baixarFatura, cancelarFatura, reagendarFatura } from "../actions";

export function InvoiceActions({ invoiceId, status, dataVencimento }: { invoiceId: string; status: string; dataVencimento?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hoje = new Date().toISOString().split("T")[0];
  const [dataPgto, setDataPgto] = useState(dataVencimento ?? hoje);
  const [novoVenc, setNovoVenc] = useState(dataVencimento ?? hoje);
  const [reagendando, setReagendando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "pendente") return null;

  function handleBaixar() {
    startTransition(async () => {
      setError(null);
      const res = await baixarFatura(invoiceId, dataPgto);
      if (res.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  function handleReagendar() {
    startTransition(async () => {
      setError(null);
      const res = await reagendarFatura(invoiceId, novoVenc);
      if (res.error) { setError(res.error); return; }
      setReagendando(false);
      router.refresh();
    });
  }

  function handleCancelar() {
    if (!confirm("Cancelar esta fatura? Os lançamentos de receita e pagamento também serão cancelados.")) return;
    startTransition(async () => {
      await cancelarFatura(invoiceId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-ps-navy/5 pt-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div>
        <label className="block text-xs text-ps-muted mb-1">Data de pagamento</label>
        <input type="date" value={dataPgto} onChange={e => setDataPgto(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm bg-white" />
      </div>
      <button onClick={handleBaixar} disabled={isPending}
        className="w-full bg-ps-green text-ps-navy text-sm font-bold rounded-ps-sm py-2 hover:bg-ps-green/90 disabled:opacity-60 transition-colors">
        {isPending ? "..." : "✓ Dar baixa (pago)"}
      </button>

      {reagendando ? (
        <div className="space-y-2 rounded-ps-sm bg-ps-bg-2/60 p-2">
          <label className="block text-xs text-ps-muted">Novo vencimento (move o a receber e o repasse)</label>
          <input type="date" value={novoVenc} onChange={e => setNovoVenc(e.target.value)}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm bg-white" />
          <div className="flex gap-2">
            <button onClick={handleReagendar} disabled={isPending}
              className="flex-1 bg-ps-navy text-white text-sm font-medium rounded-ps-sm py-1.5 hover:bg-ps-navy/90 disabled:opacity-60 transition-colors">
              {isPending ? "..." : "Salvar data"}
            </button>
            <button onClick={() => setReagendando(false)} disabled={isPending}
              className="px-3 text-sm text-ps-muted hover:text-ps-ink transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setReagendando(true)} disabled={isPending}
          className="w-full bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm py-1.5 hover:bg-ps-bg-2 disabled:opacity-60 transition-colors">
          Alterar vencimento
        </button>
      )}

      <button onClick={handleCancelar} disabled={isPending}
        className="w-full bg-red-50 text-red-700 text-sm font-medium rounded-ps-sm py-1.5 hover:bg-red-100 disabled:opacity-60 transition-colors">
        Cancelar fatura
      </button>
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { baixarFatura, cancelarFatura } from "../actions";

export function InvoiceActions({
  invoiceId,
  status,
  dataVencimento,
  bankAccounts,
}: {
  invoiceId: string;
  status: string;
  dataVencimento?: string | null;
  bankAccounts: Array<{ id: string; nickname: string | null; bank_name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dataPgto, setDataPgto] = useState(dataVencimento ?? new Date().toISOString().split("T")[0]);
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  if (status !== "pendente") return null;

  function handleBaixar() {
    if (!bankAccountId) { setError("Selecione a conta bancária do repasse."); return; }
    startTransition(async () => {
      const res = await baixarFatura(invoiceId, dataPgto, bankAccountId);
      if (res.error) { setError(res.error); return; }
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
      <div>
        <label className="block text-xs text-ps-muted mb-1">Conta bancária do repasse</label>
        <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm bg-white">
          <option value="">Selecione...</option>
          {bankAccounts.map(a => (
            <option key={a.id} value={a.id}>{a.nickname ?? a.bank_name}</option>
          ))}
        </select>
      </div>
      <button onClick={handleBaixar} disabled={isPending}
        className="w-full bg-ps-green text-ps-navy text-sm font-bold rounded-ps-sm py-2 hover:bg-ps-green/90 disabled:opacity-60 transition-colors">
        {isPending ? "..." : "✓ Dar baixa (pago)"}
      </button>
      <button onClick={handleCancelar} disabled={isPending}
        className="w-full bg-red-50 text-red-700 text-sm font-medium rounded-ps-sm py-1.5 hover:bg-red-100 disabled:opacity-60 transition-colors">
        Cancelar fatura
      </button>
    </div>
  );
}

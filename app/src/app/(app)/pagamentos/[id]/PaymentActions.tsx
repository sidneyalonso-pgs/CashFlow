"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settlePayment, cancelPayment } from "../actions";

export function PaymentActions({
  paymentId,
  status,
  bankAccounts,
}: {
  paymentId: string;
  status: string;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSettle() {
    startTransition(async () => {
      const result = await settlePayment(paymentId, Number(amount), paidAt, bankAccountId || null);
      if (result.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelPayment(paymentId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (status === "pago") {
    return (
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <p className="text-sm text-ps-green-700 font-medium">Pagamento já baixado.</p>
      </div>
    );
  }

  if (status === "cancelado") {
    return (
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <p className="text-sm text-ps-muted">Pagamento cancelado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
      <h3 className="font-semibold text-ps-ink">Dar baixa</h3>

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Valor pago</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Data do pagamento</label>
        <input
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Conta pagadora</label>
        <select
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione...</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname ?? a.bank_name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSettle}
        disabled={isPending}
        className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Baixando..." : "Confirmar pagamento"}
      </button>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="w-full text-sm text-red-600 hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}

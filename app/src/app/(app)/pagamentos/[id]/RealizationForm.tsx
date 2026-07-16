"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerRealization } from "../actions";

export function RealizationForm({
  paymentId,
  bankAccounts,
}: {
  paymentId: string;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await registerRealization(formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
      <h3 className="font-semibold text-ps-ink">Registrar baixa de pagamento</h3>
      <input type="hidden" name="payment_id" value={paymentId} />

      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Valor pago</label>
        <input
          name="amount"
          type="number"
          step="0.01"
          required
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Data do pagamento</label>
        <input
          name="paid_at"
          type="date"
          required
          className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm text-ps-ink-2 mb-1">Conta pagadora</label>
        <select name="bank_account_id" className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
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
        type="submit"
        disabled={isPending}
        className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Registrando..." : "Registrar baixa"}
      </button>
    </form>
  );
}

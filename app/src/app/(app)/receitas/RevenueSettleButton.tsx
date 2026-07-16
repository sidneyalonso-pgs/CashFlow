"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { settleRevenue, cancelRevenue } from "./actions";

export function RevenueSettleButton({
  revenueId,
  bankAccounts,
}: {
  revenueId: string;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSettle() {
    startTransition(async () => {
      const result = await settleRevenue(revenueId, Number(amount), receivedAt, bankAccountId || null);
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelRevenue(revenueId);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline">
        Confirmar recebimento
      </button>
      <button onClick={handleCancel} disabled={isPending} className="text-xs text-red-600 underline">
        Cancelar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Confirmar recebimento">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Valor recebido</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Data do recebimento</label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Conta recebedora</label>
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
            {isPending ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { redeemInvestment } from "./actions";

export function RedeemButton({ investmentId }: { investmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await redeemInvestment(investmentId, Number(amount), date);
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline">
        Resgatar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar resgate">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Valor resgatado</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ps-ink-2 mb-1">Data do resgate</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
          >
            {isPending ? "Registrando..." : "Confirmar resgate"}
          </button>
        </div>
      </Modal>
    </>
  );
}

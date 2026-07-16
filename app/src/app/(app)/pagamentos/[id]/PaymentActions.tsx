"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitForApproval,
  decidePayment,
  scheduleReturnForCorrection,
  cancelPayment,
} from "../actions";

export function PaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string | null } | undefined>) {
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
      <h3 className="font-semibold text-ps-ink">Ações</h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {status === "rascunho" && (
        <button
          disabled={isPending}
          onClick={() => run(() => submitForApproval(paymentId))}
          className="w-full bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 disabled:opacity-60"
        >
          Enviar para aprovação
        </button>
      )}

      {status === "pendente_aprovacao" && (
        <>
          <textarea
            placeholder="Observações (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() => run(() => decidePayment(paymentId, "aprovado", notes))}
              className="flex-1 bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              Aprovar
            </button>
            <button
              disabled={isPending}
              onClick={() => run(() => decidePayment(paymentId, "rejeitado", notes))}
              className="flex-1 bg-red-100 text-red-700 font-semibold rounded-ps-sm px-4 py-2 text-sm disabled:opacity-60"
            >
              Rejeitar
            </button>
          </div>
          <button
            disabled={isPending}
            onClick={() => run(() => scheduleReturnForCorrection(paymentId, notes))}
            className="w-full text-sm text-ps-muted hover:text-ps-ink underline"
          >
            Devolver para correção
          </button>
        </>
      )}

      {(status === "aprovado" || status === "pago_parcialmente") && (
        <p className="text-xs text-ps-muted">
          Use o formulário de baixa abaixo para registrar pagamentos.
        </p>
      )}

      {!["pago", "cancelado", "rejeitado"].includes(status) && (
        <button
          disabled={isPending}
          onClick={() => run(() => cancelPayment(paymentId))}
          className="w-full text-sm text-red-600 hover:underline"
        >
          Cancelar pagamento
        </button>
      )}
    </div>
  );
}

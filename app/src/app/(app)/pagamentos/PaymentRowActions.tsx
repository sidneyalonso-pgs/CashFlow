"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deletePayment, quickMarkPaid, markPaymentAsOpen } from "./actions";

export function PaymentRowActions({
  paymentId,
  displayStatus,
  grossAmount,
  dueDate,
}: {
  paymentId: string;
  displayStatus: string;
  grossAmount: number;
  dueDate: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [paidAt, setPaidAt] = useState(dueDate && dueDate <= today ? dueDate : today);

  const isPaid = displayStatus === "pago";

  function handleDelete() {
    startTransition(async () => {
      await deletePayment(paymentId);
    });
    setShowDelete(false);
  }

  function handleMarkPaid() {
    startTransition(async () => {
      await quickMarkPaid(paymentId, paidAt, grossAmount);
    });
    setShowMarkPaid(false);
  }

  function handleMarkOpen() {
    startTransition(async () => {
      await markPaymentAsOpen(paymentId);
    });
  }

  return (
    <>
      <div className={`flex items-center gap-0.5 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Editar */}
        <Link
          href={`/pagamentos/${paymentId}`}
          title="Editar pagamento"
          className="p-1.5 rounded text-ps-muted hover:text-ps-ink hover:bg-ps-bg-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </Link>

        {/* Mudar status */}
        {isPaid ? (
          <button
            onClick={handleMarkOpen}
            title="Reverter para em aberto"
            className="p-1.5 rounded text-ps-muted hover:text-orange-500 hover:bg-orange-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.5-5.25a.75.75 0 010-1.085l5.5-5.25a.75.75 0 011.061.025z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setShowMarkPaid(true)}
            title="Marcar como pago"
            className="p-1.5 rounded text-ps-muted hover:text-ps-green hover:bg-green-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Excluir */}
        <button
          onClick={() => setShowDelete(true)}
          title="Excluir pagamento"
          className="p-1.5 rounded text-ps-muted hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Modal excluir */}
      {showDelete && (
        <div className="fixed inset-0 bg-ps-navy-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-ps shadow-ps-lg p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-ps-ink mb-2">Excluir pagamento?</h3>
            <p className="text-sm text-ps-muted mb-5">Esta ação não pode ser desfeita. O pagamento será removido do Cash Flow.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm rounded-ps-sm border border-ps-navy/15 text-ps-ink hover:bg-ps-bg-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded-ps-sm bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal marcar como pago */}
      {showMarkPaid && (
        <div className="fixed inset-0 bg-ps-navy-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-ps shadow-ps-lg p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-ps-ink mb-4">Confirmar pagamento</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-sm text-ps-ink-2 mb-1">Data do pagamento</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full h-10 rounded-ps-sm border border-ps-navy/15 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowMarkPaid(false)}
                className="px-4 py-2 text-sm rounded-ps-sm border border-ps-navy/15 text-ps-ink hover:bg-ps-bg-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkPaid}
                className="px-4 py-2 text-sm rounded-ps-sm bg-ps-green text-ps-navy-900 font-medium hover:brightness-105 transition-all"
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

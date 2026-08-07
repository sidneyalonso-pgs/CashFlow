"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRevenue, markRevenueAsPending } from "./actions";

export function RevenueRowActions({ revenueId, status }: { revenueId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDelete, setShowDelete] = useState(false);

  const isRecebida = status === "recebida";

  function handleMarkPending() {
    startTransition(async () => {
      await markRevenueAsPending(revenueId);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteRevenue(revenueId);
      router.refresh();
    });
    setShowDelete(false);
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
        {isRecebida && (
          <button onClick={handleMarkPending} title="Marcar como pendente de recebimento" className="text-xs text-amber-700 underline">
            Pendente
          </button>
        )}
        <button onClick={() => setShowDelete(true)} title="Excluir receita" className="text-xs text-red-600 underline">
          Excluir
        </button>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-ps-navy-900/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-ps shadow-ps-lg p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-ps-ink mb-2">Excluir receita?</h3>
            <p className="text-sm text-ps-muted mb-5">Esta ação não pode ser desfeita. A receita será removida do Cash Flow.</p>
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
    </>
  );
}

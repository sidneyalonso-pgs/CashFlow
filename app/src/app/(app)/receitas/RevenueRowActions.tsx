"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteRevenue, markRevenueAsPending } from "./actions";

export function RevenueRowActions({
  revenueId,
  status,
  description,
}: {
  revenueId: string;
  status: string;
  description?: string;
}) {
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
    setShowDelete(false);
    startTransition(async () => {
      await deleteRevenue(revenueId);
      router.refresh();
    });
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

      <ConfirmDialog
        open={showDelete}
        title="Excluir receita?"
        message="Esta ação não pode ser desfeita. A receita e sua baixa serão removidas do Cash Flow."
        detail={description}
        confirmLabel="Excluir receita"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}

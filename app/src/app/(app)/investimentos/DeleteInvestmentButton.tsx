"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteInvestment } from "./actions";

export function DeleteInvestmentButton({ investmentId }: { investmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Excluir este lançamento?")) return;
    startTransition(async () => {
      await deleteInvestment(investmentId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      Excluir
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentDueDate } from "./actions";

export function InlineDueDateEdit({ paymentId, dueDate }: { paymentId: string; dueDate: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updatePaymentDueDate(paymentId, value);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-ps-ink hover:text-ps-navy group"
        title="Editar vencimento"
      >
        <span>{dueDate}</span>
        <span className="text-ps-muted group-hover:text-ps-navy text-xs">✏️</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-sm"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="text-xs text-ps-green font-semibold disabled:opacity-60"
      >
        {isPending ? "..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(dueDate ?? "");
          setError(null);
          setEditing(false);
        }}
        className="text-xs text-ps-muted hover:text-ps-ink"
      >
        Cancelar
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

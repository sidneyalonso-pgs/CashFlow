"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRevenueBankAccount } from "./actions";

type BankAccount = { id: string; label: string };

export function InlineRevenueBankAccountEdit({
  revenueId,
  bankAccountId,
  bankAccountLabel,
  bankAccounts,
}: {
  revenueId: string;
  bankAccountId: string | null;
  bankAccountLabel: string | null;
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(bankAccountId ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateRevenueBankAccount(revenueId, value || null);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-left hover:text-ps-navy group"
        title="Editar conta bancária"
      >
        <span className={bankAccountLabel ? "text-ps-ink text-xs" : "text-ps-muted text-xs italic"}>
          {bankAccountLabel ?? "sem conta"}
        </span>
        <span className="text-ps-muted group-hover:text-ps-navy text-xs opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white"
        autoFocus
      >
        <option value="">(sem conta)</option>
        {bankAccounts.map((a) => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
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
        onClick={() => { setValue(bankAccountId ?? ""); setEditing(false); }}
        className="text-xs text-ps-muted hover:text-ps-ink"
      >
        ✕
      </button>
    </div>
  );
}

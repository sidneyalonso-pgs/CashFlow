"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import { reconcileEntry, ignoreEntry } from "./actions";

type Candidate = {
  key: string;
  entityType: "payment" | "revenue";
  entityId: string;
  label: string;
  amount: number;
  date: string;
};

export function ReconcileRow({
  entry,
  candidates,
}: {
  entry: { id: string; entry_date: string; bank_description: string; amount: number; direction: string };
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReconcile() {
    const candidate = candidates.find((c) => c.key === selected);
    if (!candidate) {
      setError("Selecione um lançamento para conciliar.");
      return;
    }
    startTransition(async () => {
      const result = await reconcileEntry(entry.id, candidate.entityType, candidate.entityId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleIgnore() {
    startTransition(async () => {
      await ignoreEntry(entry.id);
      router.refresh();
    });
  }

  return (
    <tr className="border-t border-ps-navy/5">
      <td className="px-4 py-3">{entry.entry_date}</td>
      <td className="px-4 py-3">{entry.bank_description}</td>
      <td className="px-4 py-3">
        <span className={entry.direction === "entrada" ? "text-ps-green-700" : "text-red-600"}>
          {entry.direction === "entrada" ? "+" : "-"}
          {formatBRL(entry.amount)}
        </span>
      </td>
      <td className="px-4 py-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white max-w-xs"
        >
          <option value="">Selecione um lançamento...</option>
          {candidates.map((c) => (
            <option key={c.key} value={c.key}>
              {c.date} — {c.label} — {formatBRL(c.amount)}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button onClick={handleReconcile} disabled={isPending} className="text-xs text-ps-navy underline mr-3">
          Conciliar
        </button>
        <button onClick={handleIgnore} disabled={isPending} className="text-xs text-ps-muted underline">
          Ignorar
        </button>
      </td>
    </tr>
  );
}

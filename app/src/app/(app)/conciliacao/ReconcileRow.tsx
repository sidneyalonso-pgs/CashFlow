"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import { reconcileEntry, ignoreEntry, unreconcileEntry } from "./actions";
import { scoreCandidates, confidenceLabel, type Candidate } from "@/lib/reconciliation/score";

const CONFIDENCE_STYLES = {
  alta: "bg-green-100 text-green-700",
  média: "bg-yellow-100 text-yellow-700",
  baixa: "bg-gray-100 text-gray-500",
};

export function ReconcileRow({
  entry,
  candidates,
  reconciled,
}: {
  entry: { id: string; entry_date: string; bank_description: string; amount: number; direction: string };
  candidates: Candidate[];
  reconciled?: { key: string; label: string; amount: number; date: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Scoring — roda no cliente, sem custo de rede
  const scored = useMemo(
    () => scoreCandidates(entry.amount, entry.entry_date, entry.bank_description, candidates),
    [entry, candidates]
  );

  const topSuggestion = scored[0] ?? null;
  const confidence = topSuggestion ? confidenceLabel(topSuggestion.score) : null;

  const [selected, setSelected] = useState(topSuggestion?.key ?? "");

  function handleReconcile() {
    const candidate = candidates.find((c) => c.key === selected);
    if (!candidate) { setError("Selecione um lançamento para conciliar."); return; }
    startTransition(async () => {
      const result = await reconcileEntry(entry.id, candidate.entityType, candidate.entityId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleIgnore() {
    startTransition(async () => { await ignoreEntry(entry.id); router.refresh(); });
  }

  function handleUnreconcile() {
    startTransition(async () => { await unreconcileEntry(entry.id); router.refresh(); });
  }

  // Linha já conciliada
  if (reconciled) {
    return (
      <tr className="border-t border-ps-navy/5 bg-green-50/40">
        <td className="px-4 py-3 text-ps-muted">{entry.entry_date}</td>
        <td className="px-4 py-3 text-ps-muted">{entry.bank_description}</td>
        <td className="px-4 py-3">
          <span className={entry.direction === "entrada" ? "text-ps-green-700" : "text-red-600"}>
            {entry.direction === "entrada" ? "+" : "-"}{formatBRL(entry.amount)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="text-ps-green font-medium">✓ Conciliado:</span>{" "}
          <span className="text-ps-muted text-xs">{reconciled.date} — {reconciled.label} — {formatBRL(reconciled.amount)}</span>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={handleUnreconcile}
            disabled={isPending}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            Desfazer
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-ps-navy/5 hover:bg-ps-bg-2/20">
      <td className="px-4 py-3 text-sm">{entry.entry_date}</td>
      <td className="px-4 py-3 text-sm">{entry.bank_description}</td>
      <td className="px-4 py-3 text-sm">
        <span className={entry.direction === "entrada" ? "text-ps-green-700" : "text-red-600"}>
          {entry.direction === "entrada" ? "+" : "-"}{formatBRL(entry.amount)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded-ps-sm border border-ps-navy/15 px-2 py-1 text-xs bg-white max-w-xs"
            >
              <option value="">Selecione um lançamento...</option>
              {/* Sugestões primeiro, depois os demais */}
              {scored.length > 0 && (
                <optgroup label="— Sugestões —">
                  {scored.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.date} — {c.label} — {formatBRL(c.amount)}
                    </option>
                  ))}
                </optgroup>
              )}
              {candidates.filter((c) => !scored.find((s) => s.key === c.key)).length > 0 && (
                <optgroup label="— Outros —">
                  {candidates
                    .filter((c) => !scored.find((s) => s.key === c.key))
                    .map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.date} — {c.label} — {formatBRL(c.amount)}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>

            {/* Badge de confiança da sugestão atual */}
            {selected === topSuggestion?.key && confidence && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[confidence]}`}>
                {confidence}
              </span>
            )}
          </div>

          {/* Motivo da sugestão */}
          {selected === topSuggestion?.key && topSuggestion.reason && (
            <p className="text-xs text-ps-muted">{topSuggestion.reason}</p>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button onClick={handleReconcile} disabled={isPending || !selected} className="text-xs text-ps-navy underline mr-3 disabled:opacity-40">
          Conciliar
        </button>
        <button onClick={handleIgnore} disabled={isPending} className="text-xs text-ps-muted underline">
          Ignorar
        </button>
      </td>
    </tr>
  );
}

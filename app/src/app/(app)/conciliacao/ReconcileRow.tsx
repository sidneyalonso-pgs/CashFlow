"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import { reconcileEntry, ignoreEntry, unreconcileEntry } from "./actions";
import { scoreCandidates, confidenceLabel, type Candidate } from "@/lib/reconciliation/score";

const CONFIDENCE_STYLES = {
  alta: "bg-green-100 text-green-700",
  média: "bg-yellow-100 text-yellow-700",
};

export function ReconcileRow({
  entry,
  candidates,
  reconciled: initialReconciled,
}: {
  entry: { id: string; entry_date: string; bank_description: string; amount: number; direction: string };
  candidates: Candidate[];
  reconciled?: { key: string; label: string; amount: number; date: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Controla o estado conciliado localmente — evita sumir da tela ao confirmar
  const [reconciledState, setReconciledState] = useState(initialReconciled ?? null);

  const scored = useMemo(
    () => scoreCandidates(entry.amount, entry.entry_date, entry.bank_description, candidates),
    [entry, candidates]
  );

  // Só pré-seleciona se confiança for alta ou média (não baixa)
  const topSuggestion = scored[0] ?? null;
  const topConfidence = topSuggestion ? confidenceLabel(topSuggestion.score) : null;
  const shouldPreselect = topConfidence === "alta" || topConfidence === "média";

  const [selected, setSelected] = useState(shouldPreselect ? (topSuggestion?.key ?? "") : "");

  const selectedCandidate = candidates.find((c) => c.key === selected) ?? null;
  const selectedScore = scored.find((s) => s.key === selected) ?? null;
  const selectedConfidence = selectedScore ? confidenceLabel(selectedScore.score) : null;

  // Sugestões: apenas alta e média
  const goodSuggestions = scored.filter((c) => {
    const conf = confidenceLabel(c.score);
    return conf === "alta" || conf === "média";
  });
  const others = candidates.filter((c) => !goodSuggestions.find((s) => s.key === c.key));

  function handleReconcile() {
    if (!selectedCandidate) { setError("Selecione um lançamento para conciliar."); return; }
    startTransition(async () => {
      const result = await reconcileEntry(entry.id, selectedCandidate.entityType, selectedCandidate.entityId);
      if (result.error) {
        setError(result.error);
      } else {
        // Transição local: mantém na tela como conciliado sem sumir
        setReconciledState({
          key: selectedCandidate.key,
          label: selectedCandidate.label,
          amount: selectedCandidate.amount,
          date: selectedCandidate.date,
        });
        router.refresh(); // atualiza barra de progresso em background
      }
    });
  }

  function handleIgnore() {
    startTransition(async () => { await ignoreEntry(entry.id); router.refresh(); });
  }

  function handleUnreconcile() {
    startTransition(async () => {
      await unreconcileEntry(entry.id);
      setReconciledState(null);
      router.refresh();
    });
  }

  // Linha conciliada
  if (reconciledState) {
    return (
      <tr className="border-t border-ps-navy/5 bg-green-50/40">
        <td className="px-4 py-3 text-sm text-ps-muted">{entry.entry_date}</td>
        <td className="px-4 py-3 text-sm text-ps-muted">{entry.bank_description}</td>
        <td className="px-4 py-3 text-sm">
          <span className={entry.direction === "entrada" ? "text-ps-green-700" : "text-red-600"}>
            {entry.direction === "entrada" ? "+" : "-"}{formatBRL(entry.amount)}
          </span>
        </td>
        <td className="px-4 py-3 text-sm">
          <span className="text-ps-green font-medium text-xs">✓ Conciliado:</span>{" "}
          <span className="text-ps-muted text-xs">
            {reconciledState.date} — {reconciledState.label} — {formatBRL(reconciledState.amount)}
          </span>
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
              {goodSuggestions.length > 0 && (
                <optgroup label="— Sugestões —">
                  {goodSuggestions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.date} — {c.label} — {formatBRL(c.amount)}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label="— Outros —">
                  {others.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.date} — {c.label} — {formatBRL(c.amount)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {selectedConfidence && selectedConfidence !== "baixa" && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_STYLES[selectedConfidence]}`}>
                {selectedConfidence}
              </span>
            )}
          </div>

          {selectedScore && selectedConfidence !== "baixa" && selectedScore.reason && (
            <p className="text-xs text-ps-muted">{selectedScore.reason}</p>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button
          onClick={handleReconcile}
          disabled={isPending || !selected}
          className="text-xs text-ps-navy underline mr-3 disabled:opacity-40"
        >
          {isPending ? "..." : "Conciliar"}
        </button>
        <button onClick={handleIgnore} disabled={isPending} className="text-xs text-ps-muted underline">
          Ignorar
        </button>
      </td>
    </tr>
  );
}

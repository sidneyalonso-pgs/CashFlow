"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import { reconcileBatch, type BatchItem } from "./actions";

export type ProposalView = {
  /** identificador estável da proposta (primeira linha do extrato) */
  id: string;
  kind: "1:1" | "N:1" | "1:N";
  direction: "entrada" | "saida";
  confidence: "alta" | "revisar" | "conta_divergente";
  reason: string;
  entries: Array<{ id: string; date: string; description: string; amount: number }>;
  candidates: Array<{
    key: string;
    entityType: BatchItem["entityType"];
    entityId: string;
    entityIds?: string[];
    label: string;
    date: string;
    amount: number;
    accountName?: string | null;
  }>;
};

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

function toItem(p: ProposalView): BatchItem {
  return {
    entryIds: p.entries.map((e) => e.id),
    // todos os lançamentos de um grupo têm o mesmo tipo; uma receita agrupada (Central Piloto) traz vários ids
    entityType: p.candidates[0].entityType,
    entityIds: p.candidates.flatMap((c) => c.entityIds ?? [c.entityId]),
  };
}

const KIND_LABEL: Record<ProposalView["kind"], string | null> = {
  "1:1": null,
  "N:1": "várias linhas ↔ 1 lançamento",
  "1:N": "1 linha ↔ vários lançamentos",
};

export function AutoMatchPanel({ proposals }: { proposals: ProposalView[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"alta" | "revisar" | "conta_divergente">("alta");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  if (proposals.length === 0) return null;

  const open = proposals.filter((p) => !done.has(p.id));
  const byTab = {
    alta: open.filter((p) => p.confidence === "alta"),
    revisar: open.filter((p) => p.confidence === "revisar"),
    conta_divergente: open.filter((p) => p.confidence === "conta_divergente"),
  };
  const list = byTab[tab];

  function approve(items: ProposalView[]) {
    setMessage(null);
    startTransition(async () => {
      const res = await reconcileBatch(items.map(toItem), "automatico");
      if (res.error) {
        setMessage(res.error);
        return;
      }
      const skippedEntryIds = new Set(res.skipped.map((s) => s.entryId));
      setDone((prev) => {
        const next = new Set(prev);
        for (const p of items) if (!skippedEntryIds.has(p.entries[0].id)) next.add(p.id);
        return next;
      });
      setMessage(
        res.skipped.length > 0
          ? `${res.done} linha(s) conciliada(s). ${res.skipped.length} grupo(s) não passou na revalidação: ${res.skipped
              .slice(0, 3)
              .map((s) => s.reason)
              .join("; ")}.`
          : `${res.done} linha(s) conciliada(s).`
      );
      router.refresh();
    });
  }

  const tabs: Array<{ id: typeof tab; label: string; tone: string }> = [
    { id: "alta", label: "Alta confiança", tone: "text-ps-green-700" },
    { id: "revisar", label: "Para revisar", tone: "text-amber-700" },
    { id: "conta_divergente", label: "Conta divergente", tone: "text-red-600" },
  ];

  return (
    <div className="border-b border-ps-navy/5 bg-ps-bg-2/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h4 className="text-sm font-semibold text-ps-ink mr-2">Sugestões automáticas</h4>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              tab === t.id ? "bg-white border-ps-navy/20 shadow-ps-sm" : "border-transparent hover:bg-white/60"
            } ${t.tone}`}
          >
            {t.label} ({byTab[t.id].length})
          </button>
        ))}
        {tab === "alta" && byTab.alta.length > 0 && (
          <button
            disabled={isPending}
            onClick={() => approve(byTab.alta)}
            className="ml-auto bg-ps-green text-ps-navy-900 font-semibold rounded-full px-4 py-1.5 text-xs disabled:opacity-60"
          >
            {isPending ? "Conciliando..." : `Aprovar ${byTab.alta.length} sugestões`}
          </button>
        )}
      </div>

      {tab === "alta" && (
        <p className="text-xs text-ps-muted mb-2">
          Valor igual ao centavo, mesma conta bancária, até 1 dia de diferença e sem outro candidato concorrendo. Inclui
          grupos em que a soma fecha exatamente (ex.: uma folha paga em vários PIX).
        </p>
      )}
      {tab === "revisar" && (
        <p className="text-xs text-ps-muted mb-2">
          O valor bate, mas há mais de um candidato, a data está mais distante ou o lançamento não tem conta informada.
          Confirme uma a uma.
        </p>
      )}
      {tab === "conta_divergente" && (
        <p className="text-xs text-ps-muted mb-2">
          O valor e a data batem com um lançamento que foi baixado em <strong>outra conta</strong> do Treasury — provável
          baixa na conta errada. Corrija a conta do lançamento (em Pagamentos ou Receitas) e a linha passa a ter par.
        </p>
      )}

      {list.length === 0 ? (
        <p className="text-xs text-ps-muted py-2">Nada nesta lista.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-ps-sm border border-ps-navy/5 bg-white">
          <table className="w-full text-xs">
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t first:border-t-0 border-ps-navy/5 align-top">
                  <td className="px-3 py-2">
                    {p.entries.slice(0, 4).map((e) => (
                      <div key={e.id} className="flex gap-2">
                        <span className="text-ps-muted whitespace-nowrap">{fmtDate(e.date)}</span>
                        <span className="text-ps-ink">{e.description || "—"}</span>
                        <span className={`whitespace-nowrap ${p.direction === "saida" ? "text-red-600" : "text-ps-green-700"}`}>
                          {p.direction === "saida" ? "−" : "+"}
                          {formatBRL(e.amount)}
                        </span>
                      </div>
                    ))}
                    {p.entries.length > 4 && <div className="text-ps-muted">+ {p.entries.length - 4} linhas</div>}
                    {p.entries.length > 1 && (
                      <div className="text-ps-muted mt-1">
                        Total: {formatBRL(p.entries.reduce((s, e) => s + e.amount, 0))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ps-muted">→</td>
                  <td className="px-3 py-2">
                    {p.candidates.slice(0, 4).map((c) => (
                      <div key={c.key}>
                        <span className="text-ps-ink">{c.label}</span>{" "}
                        <span className="text-ps-muted">
                          {fmtDate(c.date)} · {formatBRL(c.amount)}
                        </span>
                      </div>
                    ))}
                    {p.candidates.length > 4 && <div className="text-ps-muted">+ {p.candidates.length - 4} lançamentos</div>}
                    <div className="text-ps-muted mt-1">
                      {KIND_LABEL[p.kind] ? `${KIND_LABEL[p.kind]} · ` : ""}
                      {p.reason}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.confidence !== "conta_divergente" && (
                      <button
                        disabled={isPending}
                        onClick={() => approve([p])}
                        className="rounded-full border border-ps-navy/15 px-3 py-1 text-xs font-medium hover:bg-ps-bg-2 disabled:opacity-60"
                      >
                        Aprovar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {message && <p className="text-xs text-ps-muted mt-2">{message}</p>}
    </div>
  );
}

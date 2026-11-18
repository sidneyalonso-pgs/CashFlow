"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import type { Candidate } from "@/lib/reconciliation/score";
import { reconcileBatch } from "./actions";

const TYPE_LABEL: Record<Candidate["entityType"], string> = {
  payment: "Pagamentos",
  revenue: "Receitas",
  transfer: "Transferências",
  investment_application: "Aplicações",
  investment_redemption: "Resgates",
};

const cents = (n: number) => Math.round(n * 100);
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
const daysApart = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

/**
 * Vincula UMA linha do banco a VÁRIOS lançamentos do Treasury (ex.: um débito que paga 6 consórcios, ou
 * um crédito que reúne várias receitas). Só libera quando a soma dos marcados fecha com a linha ao
 * centavo; o servidor revalida tudo antes de gravar. Os lançamentos precisam ser do mesmo tipo.
 */
export function LinkManyButton({
  entry,
  candidates,
}: {
  entry: { id: string; entry_date: string; bank_description: string; amount: number; direction: string; bank_account_id?: string };
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isOut = entry.direction === "saida";

  const pickedCandidates = candidates.filter((c) => picked.includes(c.key));
  const lockedType = pickedCandidates[0]?.entityType ?? null;
  const sum = pickedCandidates.reduce((s, c) => s + c.amount, 0);
  const diff = cents(entry.amount) - cents(sum);
  const fits = pickedCandidates.length >= 2 && diff === 0;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return candidates
      .filter((c) => !q || c.label.toLowerCase().includes(q) || (c.categoryName ?? "").toLowerCase().includes(q) || String(c.amount).includes(q))
      .sort(
        (a, b) =>
          daysApart(a.date, entry.entry_date) - daysApart(b.date, entry.entry_date) || b.amount - a.amount
      );
  }, [candidates, filter, entry.entry_date]);

  function toggle(c: Candidate) {
    setPicked((prev) => (prev.includes(c.key) ? prev.filter((k) => k !== c.key) : [...prev, c.key]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await reconcileBatch(
        [
          {
            entryIds: [entry.id],
            entityType: pickedCandidates[0].entityType,
            entityIds: pickedCandidates.flatMap((c) => c.entityIds ?? [c.entityId]),
          },
        ],
        "manual"
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.skipped.length > 0) {
        setError(res.skipped[0].reason);
        return;
      }
      setOpen(false);
      setPicked([]);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-ps-navy underline mr-3">
        Vincular vários
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-ps bg-white p-5 shadow-ps-lg text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ps-ink">Vincular vários lançamentos a esta linha</h3>
            <p className="mt-1 text-xs text-ps-muted">
              {fmtDate(entry.entry_date)} · {entry.bank_description} ·{" "}
              <span className={isOut ? "text-red-600" : "text-ps-green-700"}>
                {isOut ? "−" : "+"}
                {formatBRL(entry.amount)}
              </span>
              <br />
              Marque os lançamentos que compõem esta linha. A soma precisa fechar com o valor do banco, ao centavo.
            </p>

            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por descrição, categoria ou valor..."
              className="mt-3 rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm"
            />

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-ps-sm border border-ps-navy/5">
              {visible.length === 0 ? (
                <p className="p-4 text-center text-xs text-ps-muted">Nenhum lançamento disponível.</p>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {visible.map((c) => {
                      const checked = picked.includes(c.key);
                      const blocked = !checked && lockedType !== null && lockedType !== c.entityType;
                      const otherAccount = !!c.accountId && !!entry.bank_account_id && c.accountId !== entry.bank_account_id;
                      return (
                        <tr
                          key={c.key}
                          onClick={() => !blocked && toggle(c)}
                          className={`border-t first:border-t-0 border-ps-navy/5 ${
                            blocked ? "opacity-40" : "cursor-pointer hover:bg-ps-bg-2/40"
                          } ${checked ? "bg-green-50/60" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <input type="checkbox" checked={checked} disabled={blocked} onChange={() => toggle(c)} />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-ps-muted">{fmtDate(c.date)}</td>
                          <td className="px-2 py-2">
                            <div className="text-ps-ink">{c.label}</div>
                            <div className="text-ps-muted">
                              {TYPE_LABEL[c.entityType]}
                              {c.categoryName ? ` · ${c.categoryName}` : ""}
                              {otherAccount && c.accountName ? (
                                <span className="text-amber-700"> · baixado em {c.accountName}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatBRL(c.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums">
              <span>
                Selecionados: <strong>{pickedCandidates.length}</strong>
              </span>
              <span>
                Soma: <strong>{formatBRL(sum)}</strong>
              </span>
              <span className={diff === 0 && pickedCandidates.length > 0 ? "text-ps-green-700" : "text-amber-700"}>
                {pickedCandidates.length === 0
                  ? ""
                  : diff === 0
                    ? "✓ fecha com o banco"
                    : diff > 0
                      ? `faltam ${formatBRL(diff / 100)}`
                      : `passou ${formatBRL(-diff / 100)}`}
              </span>
              {pickedCandidates.length === 1 && diff === 0 && (
                <span className="text-ps-muted">Com um só lançamento, use "Conciliar" na linha.</span>
              )}
            </div>

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-ps-muted">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={!fits || isPending}
                className="rounded-full bg-ps-green px-4 py-1.5 text-xs font-semibold text-ps-navy-900 disabled:opacity-50"
              >
                {isPending ? "Vinculando..." : `Vincular ${pickedCandidates.length} lançamentos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

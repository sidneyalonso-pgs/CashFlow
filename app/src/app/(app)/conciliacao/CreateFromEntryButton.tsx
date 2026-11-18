"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/calculations/money";
import { createFromEntry, loadCreateOptions } from "./actions";

type Options = Awaited<ReturnType<typeof loadCreateOptions>>;

export function CreateFromEntryButton({
  entry,
}: {
  entry: { id: string; entry_date: string; bank_description: string; amount: number; direction: string; bank_account_id?: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isOut = entry.direction === "saida";

  const [mode, setMode] = useState<"transfer" | "payment" | "revenue">("transfer");
  const [otherAccountId, setOtherAccountId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");

  function openDialog() {
    setOpen(true);
    setError(null);
    setMode("transfer");
    if (!options) startTransition(async () => setOptions(await loadCreateOptions()));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createFromEntry({
        entryId: entry.id,
        mode,
        otherAccountId: otherAccountId || undefined,
        supplierId: supplierId || undefined,
        categoryId: categoryId || undefined,
        description: description || undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const accounts = (options?.accounts ?? []).filter((a) => a.id !== entry.bank_account_id);
  const categories = mode === "payment" ? options?.paymentCategories : options?.revenueCategories;

  return (
    <>
      <button onClick={openDialog} className="text-xs text-ps-navy underline mr-3">
        Criar lançamento
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-ps bg-white p-5 shadow-ps-lg space-y-3 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ps-ink">Criar lançamento a partir do extrato</h3>
            <p className="text-xs text-ps-muted">
              {entry.entry_date.split("-").reverse().join("/")} · {entry.bank_description} ·{" "}
              <span className={isOut ? "text-red-600" : "text-ps-green-700"}>
                {isOut ? "−" : "+"}
                {formatBRL(entry.amount)}
              </span>
              <br />
              Valor, data e conta vêm da linha do banco. O lançamento nasce já baixado e a linha é conciliada com ele.
            </p>

            <div className="flex gap-2">
              {(
                [
                  ["transfer", "Transferência entre contas"],
                  [isOut ? "payment" : "revenue", isOut ? "Pagamento" : "Receita"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMode(id as typeof mode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    mode === id ? "bg-ps-navy text-white border-ps-navy" : "border-ps-navy/15 hover:bg-ps-bg-2"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "transfer" && (
              <label className="block text-xs text-ps-muted">
                {isOut ? "Conta de destino" : "Conta de origem"}
                <select
                  value={otherAccountId}
                  onChange={(e) => setOtherAccountId(e.target.value)}
                  className="mt-1 w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Selecione...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname ?? a.bank_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === "payment" && (
              <label className="block text-xs text-ps-muted">
                Fornecedor
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Selecione...</option>
                  {(options?.suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.legal_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode !== "transfer" && (
              <label className="block text-xs text-ps-muted">
                Categoria {mode === "payment" ? "(opcional)" : ""}
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Selecione...</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-xs text-ps-muted">
              Descrição (opcional — padrão: texto do banco)
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-ps-sm border border-ps-navy/15 px-2 py-1.5 text-sm"
              />
            </label>

            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-ps-muted">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isPending || !options}
                className="bg-ps-green text-ps-navy-900 font-semibold rounded-full px-4 py-1.5 text-xs disabled:opacity-60"
              >
                {isPending ? "Criando..." : "Criar e conciliar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

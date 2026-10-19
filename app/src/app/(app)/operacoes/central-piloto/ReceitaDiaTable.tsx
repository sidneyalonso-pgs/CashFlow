"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReceitaDia } from "./actions";

export type ReceitaDiaRow = {
  /** data de REFERÊNCIA: o dia a que a receita se refere (competência da DRE) */
  data: string;
  /** data de APURAÇÃO: o dia em que o dinheiro cai na conta (Cash Flow, Receitas, conciliação) */
  dataApuracao: string | null;
  feePix: number | null;
  feeTed: number | null;
  feeOnboarding: number | null;
  remSpi: number | null;
  remCcme: number | null;
  bankAccountId: string | null;
  total: number;
  /** vazio = sem lançamento; lancado = receita única; legado = dias antigos (3 receitas); projecao = previsão */
  tipo: "vazio" | "lancado" | "legado" | "projecao";
};

type BankAccount = { id: string; label: string | null };

const CAMPOS = [
  { key: "feePix", label: "Fee PIX" },
  { key: "feeTed", label: "Fee TED" },
  { key: "feeOnboarding", label: "Fee Onboarding" },
  { key: "remSpi", label: "Remuneração SPI" },
  { key: "remCcme", label: "Remuneração CCME" },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaSemanaCurto(iso: string) {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][new Date(iso + "T00:00:00Z").getUTCDay()];
}

function somaLinha(r: ReceitaDiaRow) {
  return Math.round(CAMPOS.reduce((s, c) => s + (r[c.key] ?? 0), 0) * 100) / 100;
}

const inputCls =
  "w-full min-w-[112px] rounded-ps-sm border border-ps-navy/10 bg-ps-bg-2/60 px-2.5 py-1.5 text-xs font-medium tabular-nums text-ps-ink focus:outline-none focus:ring-2 focus:ring-ps-green/50 focus:border-ps-green focus:bg-white transition-colors";

export function ReceitaDiaTable({
  companyId,
  rows,
  bankAccounts,
  bancoPadraoId,
}: {
  companyId: string;
  rows: ReceitaDiaRow[];
  bankAccounts: BankAccount[];
  bancoPadraoId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, ReceitaDiaRow>>(() => Object.fromEntries(rows.map((r) => [r.data, r])));
  // linha vazia nasce editável; linha já lançada nasce em leitura, com "Editar"
  const [editing, setEditing] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.data, r.tipo === "vazio"]))
  );
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [errorByDate, setErrorByDate] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const bankById = new Map(bankAccounts.map((a) => [a.id, a.label]));

  function update(data: string, campo: CampoKey | "bankAccountId" | "dataApuracao", valor: number | string | null) {
    setState((prev) => {
      const row = { ...prev[data], [campo]: valor } as ReceitaDiaRow;
      row.total = somaLinha(row);
      return { ...prev, [data]: row };
    });
    setSavedDate((prev) => (prev === data ? null : prev));
  }

  function handleSave(data: string) {
    const row = state[data];
    setSavingDate(data);
    setSavedDate(null);
    setErrorByDate((prev) => ({ ...prev, [data]: "" }));
    startTransition(async () => {
      const result = await saveReceitaDia({
        company_id: companyId,
        data,
        data_apuracao: row.dataApuracao ?? data,
        fee_pix: row.feePix,
        fee_ted: row.feeTed,
        fee_onboarding: row.feeOnboarding,
        rem_spi: row.remSpi,
        rem_ccme: row.remCcme,
        bank_account_id: row.bankAccountId ?? bancoPadraoId,
      });
      setSavingDate(null);
      if (result.error) {
        setErrorByDate((prev) => ({ ...prev, [data]: result.error! }));
      } else {
        setSavedDate(data);
        setEditing((prev) => ({ ...prev, [data]: false }));
        router.refresh(); // a projeção do restante do mês muda a cada lançamento
      }
    });
  }


  const thCls = "text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";

  // soma por data de apuração (o que o extrato mostra de uma vez): usa os valores em tela
  const somaPorApuracao = new Map<string, { total: number; linhas: number }>();
  for (const r of rows) {
    if (r.tipo === "vazio") continue;
    const v = r.tipo === "projecao" ? r : state[r.data] ?? r;
    if (!v.dataApuracao || !(v.total > 0)) continue;
    const atual = somaPorApuracao.get(v.dataApuracao) ?? { total: 0, linhas: 0 };
    somaPorApuracao.set(v.dataApuracao, { total: Math.round((atual.total + v.total) * 100) / 100, linhas: atual.linhas + 1 });
  }
  const apuracaoDe = (r: ReceitaDiaRow) => (r.tipo === "projecao" ? r : state[r.data] ?? r).dataApuracao;

  return (
    <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-ps-bg-2 sticky top-0 z-10">
          <tr>
            <th className={thCls}>Data de apuração</th>
            {CAMPOS.map((c) => (
              <th key={c.key} className={thCls}>{c.label}</th>
            ))}
            <th className={thCls}>Total apurado</th>
            <th className={thCls}>Banco de recebimento</th>
            <th className={thCls}>Data de referência</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((initial, idx) => {
            const row = initial.tipo === "projecao" ? initial : state[initial.data] ?? initial;
            const projecao = initial.tipo === "projecao";
            const busy = savingDate === initial.data && isPending;
            const isEditing = !projecao && (editing[initial.data] ?? true);
            const fimDeSemana = [0, 6].includes(new Date(initial.data + "T00:00:00Z").getUTCDay());
            const apuracaoAtual = row.dataApuracao;
            const proxima = rows[idx + 1] ? apuracaoDe(rows[idx + 1]) : null;
            const ehUltimaDoGrupo = apuracaoAtual !== proxima;
            const grupo = apuracaoAtual ? somaPorApuracao.get(apuracaoAtual) : undefined;
            return (
              <Fragment key={initial.data}>
                <tr
                  className={`border-t border-ps-navy/5 transition-colors ${
                    projecao ? "bg-ps-bg-2/50 text-ps-muted italic" : fimDeSemana ? "bg-ps-bg-2/40" : "hover:bg-ps-bg-2/20"
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isEditing ? (
                      <input
                        type="date"
                        value={row.dataApuracao ?? ""}
                        onChange={(e) => update(initial.data, "dataApuracao", e.target.value || null)}
                        title="Dia em que o dinheiro cai na conta e aparece no extrato (normalmente o primeiro dia útil seguinte à referência)"
                        className={`${inputCls} min-w-[132px]`}
                      />
                    ) : (
                      <>
                        <span className={`font-semibold tabular-nums ${projecao ? "text-ps-muted" : "text-ps-ink"}`}>
                          {row.dataApuracao ? dataBR(row.dataApuracao) : "—"}
                        </span>
                        {row.dataApuracao && <span className="ml-1.5 text-[10px] text-ps-muted not-italic">{diaSemanaCurto(row.dataApuracao)}</span>}
                      </>
                    )}
                    {projecao && <span className="ml-2 rounded-full bg-ps-bg-2 border border-ps-navy/10 px-2 py-0.5 text-[10px] not-italic font-medium">projeção</span>}
                    {initial.tipo === "legado" && <span className="ml-2 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] not-italic font-medium">modelo antigo</span>}
                  </td>
                  {CAMPOS.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row[c.key] ?? ""}
                          onChange={(e) => update(initial.data, c.key, e.target.value === "" ? null : Number(e.target.value))}
                          placeholder="0,00"
                          className={inputCls}
                        />
                      ) : (
                        <span className="tabular-nums whitespace-nowrap font-medium">{fmt(row[c.key])}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap font-bold text-ps-ink">
                    {initial.tipo === "vazio" && !isEditing ? "—" : fmt(row.total)}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <select
                        value={row.bankAccountId ?? bancoPadraoId ?? ""}
                        onChange={(e) => update(initial.data, "bankAccountId", e.target.value || null)}
                        className={`${inputCls} min-w-[160px]`}
                      >
                        <option value="">Selecione...</option>
                        {bankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium whitespace-nowrap">{bankById.get(row.bankAccountId ?? "") ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" title="Dia a que esta receita se refere (competência da DRE)">
                    <span className={`tabular-nums font-medium ${projecao ? "text-ps-muted" : "text-ps-ink-2"}`}>{dataBR(initial.data)}</span>
                    <span className="ml-1.5 text-[10px] text-ps-muted not-italic">{diaSemanaCurto(initial.data)}</span>
                  </td>
                  <td className="px-3 py-2 not-italic">
                    {projecao ? null : isEditing ? (
                      <button
                        type="button"
                        onClick={() => handleSave(initial.data)}
                        disabled={busy}
                        className="bg-ps-navy text-white font-medium rounded-full px-3 py-1.5 text-[11px] disabled:opacity-60 hover:bg-ps-navy-700 transition-colors whitespace-nowrap"
                      >
                        {busy ? "..." : "Salvar"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing((prev) => ({ ...prev, [initial.data]: true }))}
                        className="bg-white border border-ps-navy/15 text-ps-ink font-medium rounded-full px-3 py-1.5 text-[11px] hover:bg-ps-bg-2 transition-colors whitespace-nowrap"
                      >
                        Editar
                      </button>
                    )}
                    {savedDate === initial.data && <p className="text-[10px] text-ps-green-700 mt-1 font-medium">✓ Salvo</p>}
                    {errorByDate[initial.data] && <p className="text-[10px] text-red-600 mt-1 max-w-[200px]">{errorByDate[initial.data]}</p>}
                  </td>
                </tr>
                {/* vários dias de referência caem juntos na mesma data de apuração: mostra a soma, que é o que o extrato traz */}
                {ehUltimaDoGrupo && grupo && grupo.linhas > 1 && apuracaoAtual && (
                  <tr className="bg-ps-navy-50/60 border-t border-ps-navy/5 not-italic">
                    <td colSpan={CAMPOS.length + 5} className="px-3 py-1.5 text-[11px] text-ps-navy font-semibold">
                      Crédito de {dataBR(apuracaoAtual)} no extrato: {fmt(grupo.total)}{" "}
                      <span className="font-normal text-ps-muted">(soma de {grupo.linhas} dias de referência)</span>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

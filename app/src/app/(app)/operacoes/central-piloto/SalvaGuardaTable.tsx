"use client";

import { useState, useTransition } from "react";
import { saveSalvaGuardaDay } from "./actions";

export type SalvaGuardaRow = {
  data: string;
  saldoEmConta: number | null;
  fee: number | null;
  remuneracaoSpi: number | null;
  remuneracaoCcme: number | null;
  bankAccountId: string | null;
  saldoAdmin: number | null;
  valorAplicadoSalvaGuarda: number | null;
  saldo4111: number | null;
  gap: number | null;
  taxaCcme: number;
  retiradas: number | null;
  deixarNaCcme: number | null;
};

type BankAccount = { id: string; label: string | null };

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaSemanaCurto(iso: string) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return dias[new Date(iso + "T00:00:00Z").getUTCDay()];
}

function isWeekend(iso: string) {
  const day = new Date(iso + "T00:00:00Z").getUTCDay();
  return day === 0 || day === 6;
}

const inputCls =
  "w-full min-w-[108px] rounded-ps-sm border border-ps-navy/10 bg-ps-bg-2/60 px-2.5 py-1.5 text-xs font-medium tabular-nums text-ps-ink focus:outline-none focus:ring-2 focus:ring-ps-green/50 focus:border-ps-green focus:bg-white transition-colors";

function Editable({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      placeholder={placeholder ?? "0,00"}
      className={inputCls}
    />
  );
}

function GapBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ps-muted text-xs">—</span>;
  const ok = value >= 1;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        ok ? "bg-ps-green-200 text-ps-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-ps-green-700" : "bg-amber-600"}`} />
      {fmtPct(value)}
    </span>
  );
}

export function SalvaGuardaTable({
  companyId,
  rows,
  bankAccounts,
}: {
  companyId: string;
  rows: SalvaGuardaRow[];
  bankAccounts: BankAccount[];
}) {
  const [state, setState] = useState<Record<string, SalvaGuardaRow>>(() =>
    Object.fromEntries(rows.map((r) => [r.data, r]))
  );
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [errorByDate, setErrorByDate] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function update(data: string, field: keyof SalvaGuardaRow, value: number | string | null) {
    setState((prev) => {
      const row = { ...prev[data], [field]: value } as SalvaGuardaRow;
      row.valorAplicadoSalvaGuarda = row.saldoEmConta != null ? row.saldoEmConta - 80000 : null;
      row.gap =
        row.saldo4111 && row.valorAplicadoSalvaGuarda != null && row.deixarNaCcme != null
          ? (row.valorAplicadoSalvaGuarda + row.deixarNaCcme) / row.saldo4111
          : null;
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
      const result = await saveSalvaGuardaDay({
        company_id: companyId,
        data,
        saldo_em_conta: row.saldoEmConta,
        fee: row.fee,
        remuneracao_spi: row.remuneracaoSpi,
        bank_account_id: row.bankAccountId,
        saldo_4111: row.saldo4111,
        taxa_ccme: row.taxaCcme,
        retiradas: row.retiradas,
        deixar_na_ccme: row.deixarNaCcme,
      });
      setSavingDate(null);
      if (result.error) {
        setErrorByDate((prev) => ({ ...prev, [data]: result.error! }));
      } else {
        setSavedDate(data);
      }
    });
  }

  const thCls = "text-left px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";

  return (
    <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-ps-bg-2 sticky top-0 z-10">
          <tr>
            <th className={thCls}>Data</th>
            <th className={thCls}>Saldo em conta</th>
            <th className={thCls}>Fee</th>
            <th className={thCls}>Rem. SPI</th>
            <th className={thCls}>Saldo Admin</th>
            <th className={thCls}>Aplicado Salva-Guarda</th>
            <th className={thCls}>Rem. CCME (calc.)</th>
            <th className={thCls}>Banco</th>
            <th className={thCls}>Saldo 4111</th>
            <th className={thCls}>GAP 4111</th>
            <th className={thCls}>Taxa CCME</th>
            <th className={thCls}>Retiradas</th>
            <th className={thCls}>Deixar na CCME</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((initial) => {
            const row = state[initial.data] ?? initial;
            const weekend = isWeekend(initial.data);
            const busy = savingDate === initial.data && isPending;
            return (
              <tr
                key={initial.data}
                className={`border-t border-ps-navy/5 transition-colors ${weekend ? "bg-ps-bg-2/40" : "hover:bg-ps-bg-2/20"}`}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold text-ps-ink">{dataBR(initial.data)}</span>
                  <span className={`ml-1.5 text-[10px] ${weekend ? "text-ps-green-700 font-semibold" : "text-ps-muted"}`}>
                    {diaSemanaCurto(initial.data)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.saldoEmConta} onChange={(v) => update(initial.data, "saldoEmConta", v)} />
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.fee} onChange={(v) => update(initial.data, "fee", v)} />
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.remuneracaoSpi} onChange={(v) => update(initial.data, "remuneracaoSpi", v)} />
                </td>
                <td className="px-3 py-2 text-ps-ink-2 font-medium tabular-nums whitespace-nowrap">{fmt(row.saldoAdmin)}</td>
                <td className="px-3 py-2 text-ps-ink-2 font-medium tabular-nums whitespace-nowrap">{fmt(row.valorAplicadoSalvaGuarda)}</td>
                <td className="px-3 py-2 text-ps-ink-2 font-medium tabular-nums whitespace-nowrap" title="Calculado: (Aplicado + Deixar na CCME de ontem) × Taxa CCME de ontem">
                  {fmt(row.remuneracaoCcme)}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.bankAccountId ?? ""}
                    onChange={(e) => update(initial.data, "bankAccountId", e.target.value || null)}
                    className={`${inputCls} min-w-[150px]`}
                  >
                    <option value="">Selecione...</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.saldo4111} onChange={(v) => update(initial.data, "saldo4111", v)} />
                </td>
                <td className="px-3 py-2">
                  <GapBadge value={row.gap} />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={row.taxaCcme}
                    onChange={(e) => update(initial.data, "taxaCcme", Number(e.target.value))}
                    className={`${inputCls} min-w-[64px]`}
                  />
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.retiradas} onChange={(v) => update(initial.data, "retiradas", v)} />
                </td>
                <td className="px-3 py-2">
                  <Editable value={row.deixarNaCcme} onChange={(v) => update(initial.data, "deixarNaCcme", v)} />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleSave(initial.data)}
                    disabled={busy}
                    className="bg-ps-navy text-white font-medium rounded-ps-sm px-3 py-1.5 text-[11px] disabled:opacity-60 hover:bg-ps-navy-700 transition-colors whitespace-nowrap"
                  >
                    {busy ? "..." : "Salvar"}
                  </button>
                  {savedDate === initial.data && <p className="text-[10px] text-ps-green-700 mt-1 font-medium">✓ Salvo</p>}
                  {errorByDate[initial.data] && <p className="text-[10px] text-red-600 mt-1 max-w-[160px]">{errorByDate[initial.data]}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

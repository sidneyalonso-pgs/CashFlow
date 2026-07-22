"use client";

import { useState, useTransition } from "react";
import { generateRecurringProvisions, updateSupplierRecurring } from "@/app/(app)/cadastros/fornecedores/actions";

type RecurringSupplier = {
  id: string;
  legal_name: string;
  recurring_amount: number | null;
  recurring_day_of_month: number | null;
  default_description: string | null;
};

type Company = { id: string; legal_name: string; trade_name: string | null };

const inputCls =
  "h-8 rounded border border-ps-navy/15 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green transition-all hover:border-ps-navy/30";

function SupplierProvisionRow({
  supplier,
  companies,
}: {
  supplier: RecurringSupplier;
  companies: Company[];
}) {
  const [isPending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [months, setMonths] = useState(3);
  const [genResult, setGenResult] = useState<string | null>(null);

  const [amount, setAmount] = useState(supplier.recurring_amount?.toString() ?? "");
  const [day, setDay] = useState(supplier.recurring_day_of_month?.toString() ?? "");
  const [configDirty, setConfigDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const canGenerate = !!amount && !!day && !!companyId;

  function handleSaveConfig() {
    startTransition(async () => {
      const res = await updateSupplierRecurring(supplier.id, {
        recurring_amount: amount ? Number(amount) : null,
        recurring_day_of_month: day ? Number(day) : null,
      });
      if (!res.error) {
        setConfigDirty(false);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
      }
    });
  }

  function handleGenerate() {
    setGenResult(null);
    startTransition(async () => {
      // Salva config antes de gerar, se foi alterada
      if (configDirty) {
        await updateSupplierRecurring(supplier.id, {
          recurring_amount: amount ? Number(amount) : null,
          recurring_day_of_month: day ? Number(day) : null,
        });
        setConfigDirty(false);
      }
      const res = await generateRecurringProvisions(
        supplier.id,
        companyId,
        months,
        amount ? Number(amount) : undefined,
        day ? Number(day) : undefined
      );
      if (res.error) {
        setGenResult(`Erro: ${res.error}`);
      } else {
        const n = (res as any).created?.length ?? 0;
        setGenResult(n === 0 ? "Meses já lançados." : `✓ ${n} pagamento(s) gerado(s).`);
      }
    });
  }

  return (
    <tr className="border-t border-ps-navy/5 hover:bg-ps-bg-2/30 transition-colors">
      {/* Fornecedor */}
      <td className="px-4 py-3 min-w-[200px]">
        <span className="text-sm font-medium text-ps-ink">{supplier.legal_name}</span>
        {supplier.default_description && (
          <p className="text-xs text-ps-muted mt-0.5 truncate max-w-[220px]">{supplier.default_description}</p>
        )}
      </td>

      {/* Valor mensal */}
      <td className="px-4 py-3 min-w-[130px]">
        <div className="flex items-center gap-1">
          <span className="text-xs text-ps-muted">R$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setConfigDirty(true); setSavedOk(false); }}
            placeholder="0,00"
            className={`${inputCls} w-24 tabular-nums`}
          />
        </div>
      </td>

      {/* Dia do vencimento */}
      <td className="px-4 py-3 min-w-[100px]">
        <div className="flex items-center gap-1">
          <span className="text-xs text-ps-muted">Dia</span>
          <input
            type="number"
            min="1"
            max="28"
            value={day}
            onChange={(e) => { setDay(e.target.value); setConfigDirty(true); setSavedOk(false); }}
            placeholder="—"
            className={`${inputCls} w-14 text-center`}
          />
        </div>
      </td>

      {/* Salvar config */}
      <td className="px-4 py-3 min-w-[80px]">
        {configDirty && (
          <button
            onClick={handleSaveConfig}
            disabled={isPending}
            className="text-xs bg-ps-navy/10 text-ps-navy font-semibold rounded px-2.5 py-1.5 hover:bg-ps-navy/20 transition-colors disabled:opacity-50"
          >
            Salvar
          </button>
        )}
        {savedOk && !configDirty && (
          <span className="text-xs text-ps-green font-medium">✓</span>
        )}
      </td>

      {/* Empresa */}
      <td className="px-4 py-3 min-w-[150px]">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className={`${inputCls} w-full`}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
      </td>

      {/* Período */}
      <td className="px-4 py-3 min-w-[110px]">
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className={`${inputCls} w-full`}
        >
          <option value={1}>1 mês</option>
          <option value={2}>2 meses</option>
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
        </select>
      </td>

      {/* Gerar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isPending}
            title={!canGenerate ? "Preencha valor e dia de vencimento" : undefined}
            className="text-xs bg-ps-green text-ps-navy-900 font-semibold rounded px-3 py-1.5 disabled:opacity-40 hover:brightness-105 transition-all whitespace-nowrap"
          >
            {isPending ? "..." : "Gerar"}
          </button>
          {genResult && (
            <span className={`text-xs whitespace-nowrap ${genResult.startsWith("Erro") ? "text-red-500" : "text-ps-green font-medium"}`}>
              {genResult}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function RecurringSupplierPanel({
  suppliers,
  companies,
}: {
  suppliers: RecurringSupplier[];
  companies: Company[];
}) {
  const [allCompany, setAllCompany] = useState(companies[0]?.id ?? "");
  const [allMonths, setAllMonths] = useState(3);
  const [isPending, startTransition] = useTransition();
  const [allResult, setAllResult] = useState<string | null>(null);

  function handleGenerateAll() {
    setAllResult(null);
    startTransition(async () => {
      let total = 0;
      for (const s of suppliers) {
        const res = await generateRecurringProvisions(s.id, allCompany, allMonths);
        if (!res.error) total += (res as any).created?.length ?? 0;
      }
      setAllResult(`✓ ${total} pagamento(s) gerado(s).`);
    });
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-8 text-center">
        <p className="text-sm text-ps-muted">
          Nenhum fornecedor marcado como recorrente.{" "}
          <a href="/cadastros/fornecedores" className="text-ps-navy underline">
            Ative a coluna "Recorrente" em Cadastros → Fornecedores.
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Gerar todos */}
      {suppliers.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-ps-bg-2 rounded-ps-sm border border-ps-navy/5">
          <span className="text-sm text-ps-muted">Gerar todos ({suppliers.length}):</span>
          <select
            value={allCompany}
            onChange={(e) => setAllCompany(e.target.value)}
            className="h-8 rounded border border-ps-navy/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
            ))}
          </select>
          <select
            value={allMonths}
            onChange={(e) => setAllMonths(Number(e.target.value))}
            className="h-8 rounded border border-ps-navy/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
          >
            <option value={1}>1 mês</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
          <button
            onClick={handleGenerateAll}
            disabled={isPending}
            className="text-xs bg-ps-navy text-white font-semibold rounded px-3 py-1.5 disabled:opacity-60 hover:bg-ps-navy-700 transition-colors"
          >
            {isPending ? "Gerando..." : "Gerar todos"}
          </button>
          {allResult && <span className="text-xs text-ps-green font-medium">{allResult}</span>}
        </div>
      )}

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Fornecedor</th>
              <th className="text-left px-4 py-3">Valor mensal</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="px-4 py-3"></th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Período</th>
              <th className="text-left px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <SupplierProvisionRow key={s.id} supplier={s} companies={companies} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

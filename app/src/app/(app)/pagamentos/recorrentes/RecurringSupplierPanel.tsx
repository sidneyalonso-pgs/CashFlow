"use client";

import { useState, useTransition } from "react";
import { generateRecurringProvisions } from "@/app/(app)/cadastros/fornecedores/actions";
import { formatBRL } from "@/lib/calculations/money";

type RecurringSupplier = {
  id: string;
  legal_name: string;
  recurring_amount: number | null;
  recurring_day_of_month: number | null;
  default_description: string | null;
};

type Company = { id: string; legal_name: string; trade_name: string | null };

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
  const [result, setResult] = useState<{ count: number; message: string } | null>(null);

  const canGenerate = !!supplier.recurring_amount && !!supplier.recurring_day_of_month && !!companyId;

  function handleGenerate() {
    setResult(null);
    startTransition(async () => {
      const res = await generateRecurringProvisions(supplier.id, companyId, months);
      if (res.error) {
        setResult({ count: 0, message: `Erro: ${res.error}` });
      } else {
        const n = (res as any).created?.length ?? 0;
        setResult({
          count: n,
          message: n === 0 ? "Todos os meses já tinham pagamentos." : `${n} pagamento(s) gerado(s).`,
        });
      }
    });
  }

  return (
    <tr className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40 transition-colors">
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-ps-ink">{supplier.legal_name}</span>
        {supplier.default_description && (
          <p className="text-xs text-ps-muted mt-0.5">{supplier.default_description}</p>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-sm">
        {supplier.recurring_amount ? formatBRL(supplier.recurring_amount) : (
          <span className="text-xs text-orange-500">Valor não definido</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-ps-muted">
        {supplier.recurring_day_of_month ? `Dia ${supplier.recurring_day_of_month}` : (
          <span className="text-xs text-orange-500">Dia não definido</span>
        )}
      </td>
      <td className="px-4 py-3">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="h-8 rounded border border-ps-navy/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="h-8 rounded border border-ps-navy/15 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
        >
          <option value={1}>1 mês</option>
          <option value={2}>2 meses</option>
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isPending}
            title={!canGenerate ? "Configure valor e dia do vencimento no cadastro do fornecedor" : undefined}
            className="text-xs bg-ps-green text-ps-navy-900 font-semibold rounded px-3 py-1.5 disabled:opacity-40 hover:brightness-105 transition-all"
          >
            {isPending ? "Gerando..." : "Gerar"}
          </button>
          {result && (
            <span className={`text-xs ${result.count > 0 ? "text-ps-green font-medium" : "text-ps-muted"}`}>
              {result.message}
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

  const readySuppliers = suppliers.filter((s) => s.recurring_amount && s.recurring_day_of_month);
  const missingConfig = suppliers.filter((s) => !s.recurring_amount || !s.recurring_day_of_month);

  function handleGenerateAll() {
    setAllResult(null);
    startTransition(async () => {
      let total = 0;
      for (const s of readySuppliers) {
        const res = await generateRecurringProvisions(s.id, allCompany, allMonths);
        if (!res.error) total += (res as any).created?.length ?? 0;
      }
      setAllResult(`${total} pagamento(s) gerado(s) no total.`);
    });
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-8 text-center">
        <p className="text-sm text-ps-muted">
          Nenhum fornecedor marcado como recorrente.{" "}
          <a href="/cadastros/fornecedores" className="text-ps-navy underline">
            Configure em Cadastros → Fornecedores
          </a>{" "}
          ativando a coluna "Recorrente".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Gerar para todos */}
      {readySuppliers.length > 1 && (
        <div className="flex items-center gap-3 p-3 bg-ps-bg-2 rounded-ps-sm border border-ps-navy/5">
          <span className="text-sm text-ps-muted">Gerar para todos os {readySuppliers.length} fornecedores configurados:</span>
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

      {missingConfig.length > 0 && (
        <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2">
          {missingConfig.length} fornecedor(es) sem valor ou dia configurado:{" "}
          {missingConfig.map((s) => s.legal_name).join(", ")}.{" "}
          <a href="/cadastros/fornecedores" className="underline">Configure em Fornecedores.</a>
        </p>
      )}

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Fornecedor</th>
              <th className="text-left px-4 py-3">Valor mensal</th>
              <th className="text-left px-4 py-3">Vencimento</th>
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

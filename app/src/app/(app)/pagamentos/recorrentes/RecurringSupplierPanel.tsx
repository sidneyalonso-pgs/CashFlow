"use client";

import { useState, useTransition } from "react";
import { generateRecurringProvisions, updateSupplierRecurring } from "@/app/(app)/cadastros/fornecedores/actions";

type RecurringSupplier = {
  id: string;
  legal_name: string;
  recurring_amount: number | null;
  recurring_week_of_month: number | null;
  default_description: string | null;
};

type Company = { id: string; legal_name: string; trade_name: string | null };

type SupplierCompanyInfo = {
  lastAmount: number | null;
  launchedThisMonth: boolean;
  lastStatus: string | null;
};

const inputCls =
  "h-8 rounded border border-ps-navy/15 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green focus:border-ps-green transition-all hover:border-ps-navy/30";

function formatBRL(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SupplierProvisionRow({
  supplier,
  company,
  info,
}: {
  supplier: RecurringSupplier;
  company: Company;
  info: SupplierCompanyInfo | undefined;
}) {
  const [isPending, startTransition] = useTransition();
  const [months, setMonths] = useState(1);
  const [genResult, setGenResult] = useState<string | null>(null);

  const lastAmount = info?.lastAmount ?? null;
  const launchedThisMonth = info?.launchedThisMonth ?? false;
  const lastStatus = info?.lastStatus ?? null;

  const [amount, setAmount] = useState(
    supplier.recurring_amount?.toString() ?? lastAmount?.toString() ?? ""
  );
  const [week, setWeek] = useState(supplier.recurring_week_of_month?.toString() ?? "");
  const [configDirty, setConfigDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const canGenerate = !!amount && !!week;

  function handleSaveConfig() {
    startTransition(async () => {
      const res = await updateSupplierRecurring(supplier.id, {
        recurring_amount: amount ? Number(amount) : null,
        recurring_week_of_month: week ? Number(week) : null,
      });
      if (!res.error) {
        setConfigDirty(false);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
      }
    });
  }

  function handleUseLastAmount() {
    if (lastAmount) {
      setAmount(lastAmount.toString());
      setConfigDirty(true);
      setSavedOk(false);
    }
  }

  function handleGenerate() {
    setGenResult(null);
    startTransition(async () => {
      if (configDirty) {
        await updateSupplierRecurring(supplier.id, {
          recurring_amount: amount ? Number(amount) : null,
          recurring_week_of_month: week ? Number(week) : null,
        });
        setConfigDirty(false);
      }
      const res = await generateRecurringProvisions(
        supplier.id,
        company.id,
        months,
        amount ? Number(amount) : undefined,
        week ? Number(week) : undefined
      );
      if (res.error) {
        setGenResult(`Erro: ${res.error}`);
      } else {
        const n = (res as any).created?.length ?? 0;
        setGenResult(n === 0 ? "Já lançado." : `✓ ${n} lançado(s).`);
      }
    });
  }

  return (
    <tr className="border-t border-ps-navy/5 hover:bg-ps-bg-2/30 transition-colors">
      {/* Fornecedor */}
      <td className="px-4 py-3 min-w-[180px]">
        <span className="text-sm font-medium text-ps-ink">{supplier.legal_name}</span>
        {supplier.default_description && (
          <p className="text-xs text-ps-muted mt-0.5 truncate max-w-[200px]">{supplier.default_description}</p>
        )}
      </td>

      {/* Último valor pago */}
      <td className="px-4 py-3 min-w-[140px]">
        {lastAmount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm tabular-nums text-ps-ink">{formatBRL(lastAmount)}</span>
            <button
              type="button"
              onClick={handleUseLastAmount}
              title="Usar esse valor"
              className="text-xs text-ps-navy/50 hover:text-ps-navy underline"
            >
              usar
            </button>
          </div>
        ) : (
          <span className="text-xs text-ps-muted">—</span>
        )}
      </td>

      {/* Status mês atual */}
      <td className="px-4 py-3 min-w-[110px]">
        {launchedThisMonth ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            lastStatus === "pago" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}>
            {lastStatus === "pago" ? "Pago" : "Provisionado"}
          </span>
        ) : (
          <span className="text-xs text-ps-muted">Não lançado</span>
        )}
      </td>

      {/* Valor a provisionar */}
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

      {/* Semana */}
      <td className="px-4 py-3 min-w-[130px]">
        <select
          value={week}
          onChange={(e) => { setWeek(e.target.value); setConfigDirty(true); setSavedOk(false); }}
          className={`${inputCls} w-full`}
        >
          <option value="">— semana</option>
          <option value="1">Semana 1 (até dia 7)</option>
          <option value="2">Semana 2 (até dia 14)</option>
          <option value="3">Semana 3 (até dia 21)</option>
          <option value="4">Semana 4 (até dia 28)</option>
        </select>
      </td>

      {/* Salvar config */}
      <td className="px-4 py-3 min-w-[60px]">
        {configDirty && (
          <button
            onClick={handleSaveConfig}
            disabled={isPending}
            className="text-xs bg-ps-navy/10 text-ps-navy font-semibold rounded px-2.5 py-1.5 hover:bg-ps-navy/20 disabled:opacity-50"
          >
            Salvar
          </button>
        )}
        {savedOk && !configDirty && <span className="text-xs text-ps-green font-medium">✓</span>}
      </td>

      {/* Período + Gerar */}
      <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-2">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className={`${inputCls} w-20`}
          >
            <option value={1}>1 mês</option>
            <option value={2}>2 meses</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isPending}
            title={!canGenerate ? "Preencha valor e semana" : undefined}
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

function CompanyTab({
  suppliers,
  company,
  paymentInfoMap,
}: {
  suppliers: RecurringSupplier[];
  company: Company;
  paymentInfoMap: Record<string, SupplierCompanyInfo>;
}) {
  const [isPending, startTransition] = useTransition();
  const [allResult, setAllResult] = useState<string | null>(null);

  function handleGenerateAll() {
    setAllResult(null);
    startTransition(async () => {
      let total = 0;
      for (const s of suppliers) {
        const res = await generateRecurringProvisions(s.id, company.id, 1);
        if (!res.error) total += (res as any).created?.length ?? 0;
      }
      setAllResult(`✓ ${total} lançamento(s) gerado(s).`);
    });
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-8 text-center">
        <p className="text-sm text-ps-muted">
          Nenhum fornecedor marcado como recorrente.{" "}
          <a href="/cadastros/fornecedores" className="text-ps-navy underline">
            Ative em Cadastros → Fornecedores.
          </a>
        </p>
      </div>
    );
  }

  const launchedCount = suppliers.filter(
    (s) => paymentInfoMap[`${s.id}__${company.id}`]?.launchedThisMonth
  ).length;

  return (
    <div className="space-y-3">
      {/* Barra de status + gerar todos */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-ps-bg-2 rounded-ps-sm border border-ps-navy/5">
        <span className="text-sm text-ps-muted">
          {launchedCount}/{suppliers.length} fornecedores lançados este mês
        </span>
        <div className="flex-1" />
        {suppliers.length > 1 && (
          <>
            <button
              onClick={handleGenerateAll}
              disabled={isPending}
              className="text-xs bg-ps-navy text-white font-semibold rounded px-3 py-1.5 disabled:opacity-60 hover:bg-ps-navy-700 transition-colors"
            >
              {isPending ? "Gerando..." : "Gerar todos (mês atual)"}
            </button>
            {allResult && <span className="text-xs text-ps-green font-medium">{allResult}</span>}
          </>
        )}
      </div>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Fornecedor</th>
              <th className="text-left px-4 py-3">Último pago</th>
              <th className="text-left px-4 py-3">Mês atual</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Semana</th>
              <th className="px-4 py-3"></th>
              <th className="text-left px-4 py-3">Período / Ação</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <SupplierProvisionRow
                key={s.id}
                supplier={s}
                company={company}
                info={paymentInfoMap[`${s.id}__${company.id}`]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RecurringSupplierPanel({
  suppliers,
  companies,
  paymentInfoMap,
}: {
  suppliers: RecurringSupplier[];
  companies: Company[];
  paymentInfoMap: Record<string, SupplierCompanyInfo>;
}) {
  const [activeTab, setActiveTab] = useState(companies[0]?.id ?? "");
  const activeCompany = companies.find((c) => c.id === activeTab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-ps-navy/10 mb-4">
        {companies.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveTab(c.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === c.id
                ? "border-ps-navy text-ps-navy"
                : "border-transparent text-ps-muted hover:text-ps-ink"
            }`}
          >
            {c.trade_name || c.legal_name}
          </button>
        ))}
      </div>

      {activeCompany && (
        <CompanyTab
          suppliers={suppliers}
          company={activeCompany}
          paymentInfoMap={paymentInfoMap}
        />
      )}
    </div>
  );
}

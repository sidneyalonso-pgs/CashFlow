import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { getWeekBuckets } from "@/lib/calculations/cashflowPeriods";
import { WeeklyFlowChart, ExpensesByCategoryChart } from "./DashboardCharts";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { company_id?: string; mes?: string; pagamentos?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;
  const pagamentosFiltro = searchParams.pagamentos === "provisionados" ? "provisionados"
    : searchParams.pagamentos === "ambos" ? "ambos"
    : "realizados";

  const today = new Date();
  const [refYear, refMonth] = (searchParams.mes ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const monthStartStr = `${refYear}-${String(refMonth).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(refYear, refMonth, 0));
  const monthEndStr = monthEndDate.toISOString().slice(0, 10);

  let bankAccountsQuery = supabase.from("bank_accounts").select("initial_balance, counts_as_available_cash, company_id");
  let outflowsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, category_id, categories(name))")
    .is("payments.deleted_at", null)
    .gte("paid_at", monthStartStr)
    .lte("paid_at", monthEndStr);
  let provisionedQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id, category_id, categories(name)")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")')
    .gte("due_date", monthStartStr)
    .lte("due_date", monthEndStr);
  let inflowsQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id)")
    .is("revenues.deleted_at", null)
    .gte("received_at", monthStartStr)
    .lte("received_at", monthEndStr);

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    outflowsQuery = outflowsQuery.eq("payments.company_id", companyId);
    provisionedQuery = provisionedQuery.eq("company_id", companyId);
    inflowsQuery = inflowsQuery.eq("revenues.company_id", companyId);
  }

  const [{ data: bankAccounts }, { data: realizedOutflows }, { data: provisionedPayments }, { data: inflows }, { data: companies }] = await Promise.all([
    bankAccountsQuery,
    pagamentosFiltro !== "provisionados" ? outflowsQuery : Promise.resolve({ data: [] }),
    pagamentosFiltro !== "realizados" ? provisionedQuery : Promise.resolve({ data: [] }),
    inflowsQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  // Normaliza provisionados para o mesmo formato dos realizados
  const provisionedOutflows = (provisionedPayments ?? []).map((p: any) => ({
    amount: Number(p.gross_amount),
    paid_at: p.due_date,
    payments: { categories: p.categories },
  }));
  const outflows = [...(realizedOutflows ?? []), ...provisionedOutflows];

  const availableCash = sumMoney(
    (bankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );

  const outflowsThisMonth = sumMoney((outflows ?? []).map((o: any) => o.amount));
  const inflowsThisMonth = sumMoney((inflows ?? []).map((i: any) => i.amount));

  const weekBuckets = getWeekBuckets(refYear, refMonth);
  let cumulativeBalance = availableCash;
  const weeklyChartData = weekBuckets.map((b) => {
    const weekInflows = sumMoney(
      (inflows ?? []).filter((i: any) => i.received_at >= b.start && i.received_at <= b.end).map((i: any) => i.amount)
    );
    const weekOutflows = sumMoney(
      (outflows ?? []).filter((o: any) => o.paid_at >= b.start && o.paid_at <= b.end).map((o: any) => o.amount)
    );
    cumulativeBalance = cumulativeBalance.plus(weekInflows).minus(weekOutflows);
    return {
      label: b.label.replace("Semana ", "S"),
      entradas: weekInflows.toNumber(),
      saidas: weekOutflows.toNumber(),
      saldo: cumulativeBalance.toNumber(),
    };
  });

  const expensesByCategoryMap = new Map<string, number>();
  for (const o of outflows ?? []) {
    const name = (o as any).payments?.categories?.name ?? "Sem categoria";
    expensesByCategoryMap.set(name, (expensesByCategoryMap.get(name) ?? 0) + Number((o as any).amount));
  }
  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: `${refYear}-${String(i + 1).padStart(2, "0")}`,
    label: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][i],
  }));

  return (
    <div>
      <PageHeader title="Visão geral" subtitle="Posição de caixa consolidada e pendências do grupo" />

      <form className="flex flex-wrap gap-3 mb-6">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <select name="mes" defaultValue={`${refYear}-${String(refMonth).padStart(2, "0")}`} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}/{refYear}
            </option>
          ))}
        </select>
        <select name="pagamentos" defaultValue={pagamentosFiltro} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="realizados">Pagamentos realizados</option>
          <option value="provisionados">Pagamentos provisionados</option>
          <option value="ambos">Realizados + Provisionados</option>
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <FinancialCard label="Caixa disponível hoje" value={formatBRL(availableCash)} />
        <FinancialCard label="Entradas realizadas (mês)" value={formatBRL(inflowsThisMonth)} tone="positive" />
        <FinancialCard
          label={pagamentosFiltro === "provisionados" ? "Saídas provisionadas (mês)" : pagamentosFiltro === "ambos" ? "Saídas realizadas + provisionadas (mês)" : "Saídas realizadas (mês)"}
          value={formatBRL(outflowsThisMonth)}
          tone="negative"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyFlowChart data={weeklyChartData} />
        <ExpensesByCategoryChart data={expensesByCategory} />
      </div>
    </div>
  );
}

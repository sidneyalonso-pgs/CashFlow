import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { getWeekBuckets, shiftDay } from "@/lib/calculations/cashflowPeriods";
import { scopeAccounts, transferDirection } from "@/lib/calculations/transfers";
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
  const todayStr = today.toISOString().slice(0, 10);
  const [refYear, refMonth] = (searchParams.mes ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const monthStartStr = `${refYear}-${String(refMonth).padStart(2, "0")}-01`;
  const monthEndDate = new Date(Date.UTC(refYear, refMonth, 0));
  const monthEndStr = monthEndDate.toISOString().slice(0, 10);

  // As consultas não têm recorte de data: o saldo de abertura do mês e o caixa de hoje
  // dependem de tudo que já foi lançado antes — mesma abordagem do Cash Flow.
  let bankAccountsQuery = supabase.from("bank_accounts").select("id, initial_balance, counts_as_available_cash, company_id");
  let outflowsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, categories(name))")
    .is("payments.deleted_at", null);
  let provisionedQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id, categories(name)")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")');
  let inflowsQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id)")
    .is("revenues.deleted_at", null);
  // receita ainda não recebida (ex.: fatura de bets/mensalidade emitida) = valor a receber
  let provisionedRevenuesQuery = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id, categories(name)")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")');
  let investmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id, bank_account_id, is_opening_balance");
  let transfersQuery = supabase
    .from("transfers")
    .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id");

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    outflowsQuery = outflowsQuery.eq("payments.company_id", companyId);
    provisionedQuery = provisionedQuery.eq("company_id", companyId);
    inflowsQuery = inflowsQuery.eq("revenues.company_id", companyId);
    provisionedRevenuesQuery = provisionedRevenuesQuery.eq("company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
    // transferência entre empresas do grupo precisa aparecer nos dois lados
    transfersQuery = transfersQuery.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);
  }

  const [
    { data: bankAccounts },
    { data: realizedOutflows },
    { data: provisionedPayments },
    { data: revenueInflows },
    { data: provisionedRevenues },
    { data: investmentsRaw },
    { data: transfersRaw },
    { data: companies },
  ] = await Promise.all([
    bankAccountsQuery,
    outflowsQuery,
    provisionedQuery,
    inflowsQuery,
    provisionedRevenuesQuery,
    investmentsQuery,
    transfersQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  type Movement = { amount: number; date: string; category: string; realized: boolean };

  const paymentOutflows: Movement[] = (realizedOutflows ?? []).map((p: any) => ({
    amount: Number(p.amount),
    date: p.paid_at,
    category: p.payments?.categories?.name ?? "Sem categoria",
    realized: true,
  }));
  const provisionedOutflows: Movement[] = (provisionedPayments ?? []).map((p: any) => ({
    amount: Number(p.gross_amount),
    date: p.due_date,
    category: p.categories?.name ?? "Sem categoria",
    realized: false,
  }));

  // Investimentos: aplicação debita a conta corrente, resgate credita
  const allInvestments = (investmentsRaw ?? []) as any[];
  const invOutflows: Movement[] = allInvestments
    .filter((i) => i.tipo === "aplicacao" && !i.is_opening_balance)
    .map((i) => ({ amount: Number(i.applied_amount), date: i.applied_date, category: "Investimentos (aplicações)", realized: true }));
  const invInflows: Movement[] = allInvestments
    .filter((i) => i.tipo === "resgate")
    .map((i) => ({ amount: Number(i.applied_amount), date: i.applied_date, category: "Investimentos", realized: true }));

  // Transferências: a conta de origem/destino define a direção, igual ao Cash Flow
  const scopeAccountIds = scopeAccounts(undefined, (bankAccounts ?? []) as { id: string }[]);
  const { isInflow: isTransferIn, isOutflow: isTransferOut } = transferDirection(scopeAccountIds, companyId);
  const allTransfers = (transfersRaw ?? []) as any[];
  const transferOutflows: Movement[] = allTransfers
    .filter(isTransferOut)
    .map((t) => ({ amount: Number(t.amount), date: t.transfer_date, category: "Transferências", realized: true }));
  const transferInflows: Movement[] = allTransfers
    .filter(isTransferIn)
    .map((t) => ({ amount: Number(t.amount), date: t.transfer_date, category: "Transferências", realized: true }));

  // Entradas/Saídas são sempre só o realizado; a provisão é informada à parte, como no Cash Flow.
  // O filtro decide apenas se o saldo de fechamento é o realizado ou o projetado.
  const projetado = pagamentosFiltro !== "realizados";
  const outflows: Movement[] = [...paymentOutflows, ...invOutflows, ...transferOutflows];
  const realizedOutflowsAll = outflows;
  const realizedRevenues: Movement[] = (revenueInflows ?? []).map((r: any) => ({
    amount: Number(r.amount),
    date: r.received_at,
    category: "Receitas",
    realized: true,
  }));
  const provisionedInflows: Movement[] = (provisionedRevenues ?? []).map((r: any) => ({
    amount: Number(r.expected_amount),
    date: r.expected_date,
    category: r.categories?.name ?? "A receber",
    realized: false,
  }));
  const inflows: Movement[] = [...realizedRevenues, ...invInflows, ...transferInflows];
  const realizedInflowsAll = inflows;

  const inRange = (m: Movement, from: string, to: string) => m.date >= from && m.date <= to;
  const sumRange = (items: Movement[], from: string, to: string) =>
    sumMoney(items.filter((m) => inRange(m, from, to)).map((m) => m.amount));

  const initialCashBalance = sumMoney(
    (bankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );

  // Saldo de abertura do mês = saldo cadastrado + tudo que aconteceu antes do dia 1
  const dayBeforeMonth = shiftDay(monthStartStr, -1);
  const openingBalance = initialCashBalance
    .plus(sumRange(inflows, "0000-01-01", dayBeforeMonth))
    .minus(sumRange(outflows, "0000-01-01", dayBeforeMonth));

  const inflowsThisMonth = sumRange(inflows, monthStartStr, monthEndStr);
  const outflowsThisMonth = sumRange(outflows, monthStartStr, monthEndStr);
  const aReceberMes = sumRange(provisionedInflows, monthStartStr, monthEndStr);
  const aPagarMes = sumRange(provisionedOutflows, monthStartStr, monthEndStr);
  const closingBalance = openingBalance
    .plus(inflowsThisMonth)
    .minus(outflowsThisMonth)
    .plus(projetado ? aReceberMes : 0)
    .minus(projetado ? aPagarMes : 0);

  // Caixa de hoje considera só o que já foi realizado até a data corrente
  const availableCash = initialCashBalance
    .plus(sumRange(realizedInflowsAll, "0000-01-01", todayStr))
    .minus(sumRange(realizedOutflowsAll, "0000-01-01", todayStr));


  const weekBuckets = getWeekBuckets(refYear, refMonth);
  let cumulativeBalance = openingBalance;
  const weeklyChartData = weekBuckets.map((b) => {
    const weekInflows = sumRange(inflows, b.start, b.end);
    const weekOutflows = sumRange(outflows, b.start, b.end);
    cumulativeBalance = cumulativeBalance.plus(weekInflows).minus(weekOutflows);
    if (projetado) {
      cumulativeBalance = cumulativeBalance
        .plus(sumRange(provisionedInflows, b.start, b.end))
        .minus(sumRange(provisionedOutflows, b.start, b.end));
    }
    return {
      label: b.label.replace("Semana ", "S"),
      entradas: weekInflows.toNumber(),
      saidas: weekOutflows.toNumber(),
      saldo: cumulativeBalance.toNumber(),
    };
  });

  const expensesByCategoryMap = new Map<string, number>();
  for (const o of outflows.filter((m) => inRange(m, monthStartStr, monthEndStr))) {
    expensesByCategoryMap.set(o.category, (expensesByCategoryMap.get(o.category) ?? 0) + o.amount);
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
        <select name="pagamentos" defaultValue={projetado ? "ambos" : "realizados"} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="realizados">Saldo realizado</option>
          <option value="ambos">Saldo projetado (+ provisões)</option>
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinancialCard label={`Saldo C/C inicial (${formatShort(monthStartStr)})`} value={formatBRL(openingBalance)} />
        <FinancialCard label="Entradas (mês)" value={formatBRL(inflowsThisMonth)} tone="positive" />
        <FinancialCard label="Saídas (mês)" value={formatBRL(outflowsThisMonth)} tone="negative" />
        <FinancialCard
          label={`${projetado ? "Saldo C/C projetado" : "Saldo C/C"} (${formatShort(monthEndStr)})`}
          value={formatBRL(closingBalance)}
          tone={closingBalance.isNegative() ? "negative" : "positive"}
        />
      </div>

      <p className="text-xs text-ps-muted mb-6">
        Caixa disponível hoje ({formatShort(todayStr)}): <strong className="text-ps-ink">{formatBRL(availableCash)}</strong> — considera
        apenas lançamentos já realizados até a data de hoje, em todas as contas da seleção.
        {(!aReceberMes.isZero() || !aPagarMes.isZero()) && (
          <>
            {" "}No mês ainda há <strong className="text-amber-700">{formatBRL(aReceberMes)} a receber</strong> e{" "}
            <strong className="text-amber-700">{formatBRL(aPagarMes)} a pagar</strong>
            {projetado ? " — já somados no saldo projetado." : " — fora do saldo acima, que mostra só o realizado."}
          </>
        )}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyFlowChart data={weeklyChartData} />
        <ExpensesByCategoryChart data={expensesByCategory} />
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

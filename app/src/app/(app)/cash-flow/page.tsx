import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { getWeekBuckets, getMonthBuckets, getQuarterBuckets, type Bucket } from "@/lib/calculations/cashflowPeriods";

type Granularity = "semana" | "mes" | "trimestre";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: { company_id?: string; visao?: string; ano?: string; mes?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;
  const granularity: Granularity =
    searchParams.visao === "mes" || searchParams.visao === "trimestre" ? (searchParams.visao as Granularity) : "semana";

  const today = new Date();
  const year = Number(searchParams.ano) || today.getFullYear();
  const month = Number(searchParams.mes) || today.getMonth() + 1;

  const buckets: Bucket[] =
    granularity === "semana" ? getWeekBuckets(year, month) : granularity === "mes" ? getMonthBuckets(year) : getQuarterBuckets(year);

  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;

  let bankAccountsQuery = supabase.from("bank_accounts").select("initial_balance, counts_as_available_cash, company_id");
  let paymentRealizationsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id)")
    .is("payments.deleted_at", null);
  let revenueRealizationsQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id)")
    .is("revenues.deleted_at", null);
  let investmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id");

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    paymentRealizationsQuery = paymentRealizationsQuery.eq("payments.company_id", companyId);
    revenueRealizationsQuery = revenueRealizationsQuery.eq("revenues.company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
  }

  const [{ data: bankAccounts }, { data: paymentRealizations }, { data: revenueRealizations }, { data: investmentsData }, { data: companies }] =
    await Promise.all([
      bankAccountsQuery,
      paymentRealizationsQuery,
      revenueRealizationsQuery,
      investmentsQuery,
      supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    ]);

  const initialCashBalance = sumMoney(
    (bankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );

  // Investimentos ficam em coluna separada (não afetam saldo C/C)
  const allInvestments = (investmentsData ?? []) as Array<{ tipo: string; applied_amount: number; applied_date: string }>;

  const outflows = (paymentRealizations ?? []) as Array<{ amount: number; paid_at: string }>;
  const inflows = (revenueRealizations ?? []) as Array<{ amount: number; received_at: string }>;

  const sumInRange = (items: Array<{ amount: number }>, dates: string[], from: string, to: string) =>
    sumMoney(items.filter((_, i) => dates[i] >= from && dates[i] <= to).map((it) => it.amount));

  const outflowDates = outflows.map((o) => o.paid_at);
  const inflowDates = inflows.map((i) => i.received_at);

  // saldo inicial do período selecionado = saldo cadastrado + tudo que aconteceu antes do início do range
  const outflowsBefore = sumInRange(outflows, outflowDates, "0000-01-01", shiftDay(rangeStart, -1));
  const inflowsBefore = sumInRange(inflows, inflowDates, "0000-01-01", shiftDay(rangeStart, -1));
  let runningBalance = initialCashBalance.plus(inflowsBefore).minus(outflowsBefore);
  const openingBalance = runningBalance;

  // Saldo de investimentos acumulado até cada bucket
  const invDates = allInvestments.map((i) => i.applied_date);
  const totalInvBefore = allInvestments
    .filter((_, idx) => invDates[idx] < rangeStart)
    .reduce((acc, i) => acc + (i.tipo === "aplicacao" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);

  let runningInvBalance = totalInvBefore;
  const openingInvBalance = runningInvBalance;

  const bucketRows = buckets.map((b) => {
    const bucketInflows = sumInRange(inflows, inflowDates, b.start, b.end);
    const bucketOutflows = sumInRange(outflows, outflowDates, b.start, b.end);
    runningBalance = runningBalance.plus(bucketInflows).minus(bucketOutflows);

    const bucketInvDelta = allInvestments
      .filter((_, idx) => invDates[idx] >= b.start && invDates[idx] <= b.end)
      .reduce((acc, i) => acc + (i.tipo === "aplicacao" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);
    runningInvBalance += bucketInvDelta;

    return { ...b, inflows: bucketInflows, outflows: bucketOutflows, balance: runningBalance, invBalance: runningInvBalance };
  });

  const totalInflows = sumMoney(bucketRows.map((r) => r.inflows));
  const totalOutflows = sumMoney(bucketRows.map((r) => r.outflows));
  const closingBalance = runningBalance;
  const closingInvBalance = runningInvBalance;

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][i],
  }));
  const yearOptions = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <div>
      <PageHeader title="Cash Flow" subtitle="Resumo executivo e evolução do saldo de caixa" />

      <form className="flex flex-wrap gap-3 mb-6">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <select name="visao" defaultValue={granularity} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="semana">Por semana</option>
          <option value="mes">Por mês</option>
          <option value="trimestre">Por trimestre</option>
        </select>
        {granularity === "semana" && (
          <select name="mes" defaultValue={month} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        <select name="ano" defaultValue={year} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinancialCard label={`Saldo C/C Inicial (${formatShort(rangeStart)})`} value={formatBRL(openingBalance)} />
        <FinancialCard label="Total de Entradas" value={formatBRL(totalInflows)} tone="positive" />
        <FinancialCard label="Total de Saídas" value={formatBRL(totalOutflows)} tone="negative" />
        <FinancialCard
          label={`Saldo C/C (${formatShort(rangeEnd)})`}
          value={formatBRL(closingBalance)}
          tone={closingBalance.isNegative() ? "negative" : "neutral"}
        />
      </div>

      <h3 className="font-semibold text-ps-ink mb-2">
        Evolução do Saldo — {granularity === "semana" ? "Semanal" : granularity === "mes" ? "Mensal" : "Trimestral"}
      </h3>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Período</th>
              <th className="text-left px-4 py-3">Entradas</th>
              <th className="text-left px-4 py-3">Saídas</th>
              <th className="text-left px-4 py-3">Saldo C/C</th>
              <th className="text-left px-4 py-3 text-ps-navy/70">Saldo C/C + Invest</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ps-navy/5 bg-ps-bg-2/40">
              <td className="px-4 py-3 font-medium text-ps-ink">Saldo Inicial ({formatShort(rangeStart)})</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 tabular-nums font-semibold">{formatBRL(openingBalance)}</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-ps-navy/70">{formatBRL(openingBalance.toNumber() + openingInvBalance)}</td>
            </tr>
            {bucketRows.map((row) => {
              const detailHref = `/cash-flow/detalhe?start=${row.start}&end=${row.end}&label=${encodeURIComponent(row.label)}${
                companyId ? `&company_id=${companyId}` : ""
              }`;
              const totalWithInv = row.balance.toNumber() + row.invBalance;
              return (
                <tr key={row.label} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40">
                  <td className="px-4 py-3 font-medium">
                    <Link href={detailHref} className="text-ps-navy hover:underline">
                      {row.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ps-green-700">{formatBRL(row.inflows)}</td>
                  <td className="px-4 py-3 tabular-nums text-red-600">{formatBRL(row.outflows)}</td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${row.balance.isNegative() ? "text-red-600" : ""}`}>
                    {formatBRL(row.balance)}
                  </td>
                  <td className={`px-4 py-3 tabular-nums font-semibold text-ps-navy/70 ${totalWithInv < 0 ? "text-red-600" : ""}`}>
                    {formatBRL(totalWithInv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Saldo inicial do período = saldo cadastrado nas contas bancárias + todas as entradas e saídas realizadas
        até o dia anterior ao início do período selecionado. Cada linha soma as entradas/saídas realizadas
        (pagamentos e receitas já baixados) dentro daquele intervalo de datas.
      </p>
    </div>
  );
}

function shiftDay(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

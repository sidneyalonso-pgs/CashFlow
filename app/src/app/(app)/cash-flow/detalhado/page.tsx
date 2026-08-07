import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { formatBRL, sumMoney } from "@/lib/calculations/money";

export default async function CashFlowDetalhadoPage({
  searchParams,
}: {
  searchParams: { company_id?: string; bank_account_id?: string; date_from?: string; date_to?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;
  const bankAccountId = searchParams.bank_account_id;

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dateFrom = searchParams.date_from || defaultFrom;
  const dateTo = searchParams.date_to || defaultTo;

  let bankAccountsQuery = supabase
    .from("bank_accounts")
    .select("id, nickname, bank_name, initial_balance, counts_as_available_cash, company_id");
  let paymentRealizationsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, paying_bank_account_id)")
    .is("payments.deleted_at", null)
    .gte("paid_at", dateFrom)
    .lte("paid_at", dateTo);
  let provisionedPaymentsQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id, paying_bank_account_id")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")')
    .gte("due_date", dateFrom)
    .lte("due_date", dateTo);
  let provisionedRevenuesQuery = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id, receiving_bank_account_id")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")')
    .gte("expected_date", dateFrom)
    .lte("expected_date", dateTo);
  let investmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id, bank_account_id, is_opening_balance")
    .gte("applied_date", dateFrom)
    .lte("applied_date", dateTo);

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    paymentRealizationsQuery = paymentRealizationsQuery.eq("payments.company_id", companyId);
    provisionedPaymentsQuery = provisionedPaymentsQuery.eq("company_id", companyId);
    provisionedRevenuesQuery = provisionedRevenuesQuery.eq("company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
  }

  const [
    { data: allBankAccounts },
    { data: paymentRealizationsRaw },
    { data: provisionedPaymentsRaw },
    { data: provisionedRevenuesRaw },
    { data: investmentsRaw },
    { data: companies },
  ] = await Promise.all([
    bankAccountsQuery,
    paymentRealizationsQuery,
    provisionedPaymentsQuery,
    provisionedRevenuesQuery,
    investmentsQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const paymentRealizations = bankAccountId
    ? (paymentRealizationsRaw ?? []).filter((r: any) => (r.payments as any)?.paying_bank_account_id === bankAccountId)
    : (paymentRealizationsRaw ?? []);
  const provisionedPayments = bankAccountId
    ? (provisionedPaymentsRaw ?? []).filter((p: any) => p.paying_bank_account_id === bankAccountId)
    : (provisionedPaymentsRaw ?? []);
  const provisionedRevenues = bankAccountId
    ? (provisionedRevenuesRaw ?? []).filter((r: any) => r.receiving_bank_account_id === bankAccountId)
    : (provisionedRevenuesRaw ?? []);
  const investments = bankAccountId
    ? (investmentsRaw ?? []).filter((i: any) => i.bank_account_id === bankAccountId)
    : (investmentsRaw ?? []);

  // saldo em conta inicial: saldo cadastrado + tudo que aconteceu (realizado) antes do início do range
  let priorPaymentsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, paying_bank_account_id)")
    .is("payments.deleted_at", null)
    .lt("paid_at", dateFrom);
  let priorRevenuesQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id, receiving_bank_account_id)")
    .is("revenues.deleted_at", null)
    .lt("received_at", dateFrom);
  let priorInvestmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id, bank_account_id, is_opening_balance")
    .lt("applied_date", dateFrom);
  if (companyId) {
    priorPaymentsQuery = priorPaymentsQuery.eq("payments.company_id", companyId);
    priorRevenuesQuery = priorRevenuesQuery.eq("revenues.company_id", companyId);
    priorInvestmentsQuery = priorInvestmentsQuery.eq("company_id", companyId);
  }
  const [{ data: priorPaymentsRaw }, { data: priorRevenuesRaw }, { data: priorInvestmentsRaw }] = await Promise.all([
    priorPaymentsQuery,
    priorRevenuesQuery,
    priorInvestmentsQuery,
  ]);
  const priorPayments = bankAccountId
    ? (priorPaymentsRaw ?? []).filter((r: any) => (r.payments as any)?.paying_bank_account_id === bankAccountId)
    : (priorPaymentsRaw ?? []);
  const priorRevenues = bankAccountId
    ? (priorRevenuesRaw ?? []).filter((r: any) => (r.revenues as any)?.receiving_bank_account_id === bankAccountId)
    : (priorRevenuesRaw ?? []);
  const priorInvestments = bankAccountId
    ? (priorInvestmentsRaw ?? []).filter((i: any) => i.bank_account_id === bankAccountId)
    : (priorInvestmentsRaw ?? []);

  const initialCashBalance = sumMoney(
    (allBankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );
  const priorInflows = sumMoney(priorRevenues.map((r: any) => r.amount));
  const priorOutflows = sumMoney(priorPayments.map((p: any) => p.amount));
  const priorInvNet = sumMoney(
    priorInvestments.map((i: any) => (i.tipo === "resgate" ? Number(i.applied_amount) : -Number(i.applied_amount)))
  );

  let runningBalance = initialCashBalance.plus(priorInflows).minus(priorOutflows).plus(priorInvNet);
  const openingBalance = runningBalance;

  // agrupar por dia
  const days: string[] = [];
  for (let d = new Date(dateFrom + "T00:00:00Z"); d.toISOString().slice(0, 10) <= dateTo; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const dayRows = days.map((day) => {
    const despesas = sumMoney(paymentRealizations.filter((p: any) => p.paid_at === day).map((p: any) => p.amount));
    const provisoesPagamento = sumMoney(provisionedPayments.filter((p: any) => p.due_date === day).map((p: any) => p.gross_amount));
    const provisoesReceita = sumMoney(provisionedRevenues.filter((r: any) => r.expected_date === day).map((r: any) => r.expected_amount));
    const investimentoDia = investments
      .filter((i: any) => i.applied_date === day)
      .reduce((acc: number, i: any) => acc + (i.tipo === "resgate" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);

    // saldo em conta muda com despesas realizadas e resgates/aplicações; provisões ainda não afetam o saldo
    runningBalance = runningBalance.minus(despesas).plus(investimentoDia);

    return { day, despesas, provisoesPagamento, provisoesReceita, investimentoDia, saldo: runningBalance };
  });

  const totalDespesas = sumMoney(dayRows.map((r) => r.despesas));
  const totalProvisoesPagamento = sumMoney(dayRows.map((r) => r.provisoesPagamento));
  const totalProvisoesReceita = sumMoney(dayRows.map((r) => r.provisoesReceita));
  const totalInvestimento = sumMoney(dayRows.map((r) => r.investimentoDia));

  return (
    <div>
      <PageHeader
        title="Cash Flow Detalhado"
        subtitle="Despesas, provisões e investimentos por dia"
        actions={
          <Link
            href="/cash-flow"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar ao Resumo
          </Link>
        }
      />

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-6">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <select name="bank_account_id" defaultValue={bankAccountId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as contas</option>
          {(allBankAccounts ?? []).map((a: any) => (
            <option key={a.id} value={a.id}>
              {a.nickname ?? a.bank_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date_from"
          defaultValue={dateFrom}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        />
        <input
          type="date"
          name="date_to"
          defaultValue={dateTo}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        />
      </AutoSubmitForm>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FinancialCard label="Despesas" value={formatBRL(totalDespesas)} tone="negative" />
        <FinancialCard label="Provisões de pagamento" value={formatBRL(totalProvisoesPagamento)} />
        <FinancialCard label="Provisões de receita" value={formatBRL(totalProvisoesReceita)} tone="positive" />
        <FinancialCard
          label="Investimento (líquido)"
          value={formatBRL(totalInvestimento)}
          tone={totalInvestimento < 0 ? "negative" : totalInvestimento > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Dia</th>
              <th className="text-left px-4 py-3">Despesas</th>
              <th className="text-left px-4 py-3">Provisões de pagamento</th>
              <th className="text-left px-4 py-3">Provisões de receita</th>
              <th className="text-left px-4 py-3">Investimento</th>
              <th className="text-left px-4 py-3">Saldo em conta</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ps-navy/5 bg-ps-bg-2/40">
              <td className="px-4 py-3 font-medium text-ps-ink">Saldo inicial ({formatShort(dateFrom)})</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 tabular-nums font-semibold">{formatBRL(openingBalance)}</td>
            </tr>
            {dayRows.map((row) => (
              <tr key={row.day} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40">
                <td className="px-4 py-3 font-medium">{formatShort(row.day)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">
                  {row.despesas.isZero() ? <span className="text-ps-muted">—</span> : formatBRL(row.despesas)}
                </td>
                <td className="px-4 py-3 tabular-nums text-amber-700">
                  {row.provisoesPagamento.isZero() ? <span className="text-ps-muted">—</span> : formatBRL(row.provisoesPagamento)}
                </td>
                <td className="px-4 py-3 tabular-nums text-ps-green-700">
                  {row.provisoesReceita.isZero() ? <span className="text-ps-muted">—</span> : formatBRL(row.provisoesReceita)}
                </td>
                <td className={`px-4 py-3 tabular-nums ${row.investimentoDia < 0 ? "text-red-600" : row.investimentoDia > 0 ? "text-ps-green-700" : "text-ps-muted"}`}>
                  {row.investimentoDia === 0 ? "—" : formatBRL(row.investimentoDia)}
                </td>
                <td className={`px-4 py-3 tabular-nums font-semibold ${row.saldo.isNegative() ? "text-red-600" : ""}`}>
                  {formatBRL(row.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Despesas = pagamentos já baixados na data. Provisões de pagamento/receita = valores com vencimento/previsão
        na data mas ainda não baixados (não afetam o saldo em conta). Investimento = aplicações (saída) e resgates
        (entrada) na data. Saldo em conta considera saldo inicial cadastrado + despesas realizadas + investimentos.
      </p>
    </div>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

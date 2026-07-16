import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";

const HORIZONS = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: { company_id?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;

  let bankAccountsQuery = supabase.from("bank_accounts").select("initial_balance, counts_as_available_cash, company_id");
  let paymentRealizationsQuery = supabase.from("payment_realizations").select("amount, payments!inner(company_id)");
  let revenueRealizationsQuery = supabase.from("revenue_realizations").select("amount, revenues!inner(company_id)");
  let pendingPaymentsQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id")
    .in("status", ["agendado", "rascunho"])
    .not("gross_amount", "is", null)
    .is("deleted_at", null);
  let pendingRevenuesQuery = supabase
    .from("revenues")
    .select("expected_amount, probability_pct, expected_date, company_id")
    .in("status", ["estimada", "confirmada", "reprogramada"])
    .is("deleted_at", null);

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    paymentRealizationsQuery = paymentRealizationsQuery.eq("payments.company_id", companyId);
    revenueRealizationsQuery = revenueRealizationsQuery.eq("revenues.company_id", companyId);
    pendingPaymentsQuery = pendingPaymentsQuery.eq("company_id", companyId);
    pendingRevenuesQuery = pendingRevenuesQuery.eq("company_id", companyId);
  }

  const [
    { data: bankAccounts },
    { data: paymentRealizations },
    { data: revenueRealizations },
    { data: pendingPayments },
    { data: pendingRevenues },
    { data: companies },
  ] = await Promise.all([
    bankAccountsQuery,
    paymentRealizationsQuery,
    revenueRealizationsQuery,
    pendingPaymentsQuery,
    pendingRevenuesQuery,
    supabase.from("companies").select("id, legal_name").order("legal_name"),
  ]);

  const initialBalance = sumMoney(
    (bankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );
  const totalOutflowsRealized = sumMoney((paymentRealizations ?? []).map((r: any) => r.amount));
  const totalInflowsRealized = sumMoney((revenueRealizations ?? []).map((r: any) => r.amount));
  const currentBalance = initialBalance.plus(totalInflowsRealized).minus(totalOutflowsRealized);

  const today = new Date();

  const horizonRows = HORIZONS.map((h) => {
    const limitDate = addDays(today, h.days);

    const outflows = sumMoney(
      (pendingPayments ?? [])
        .filter((p: any) => p.due_date && p.due_date <= limitDate)
        .map((p: any) => p.gross_amount)
    );
    const inflows = sumMoney(
      (pendingRevenues ?? [])
        .filter((r: any) => r.expected_date && r.expected_date <= limitDate)
        .map((r: any) => (Number(r.expected_amount) * Number(r.probability_pct)) / 100)
    );

    const projectedBalance = currentBalance.plus(inflows).minus(outflows);

    return { ...h, inflows, outflows, projectedBalance };
  });

  return (
    <div>
      <PageHeader title="Cash Flow" subtitle="Saldo realizado e projeção de caixa" />

      <form className="flex gap-3 mb-4">
        <select
          name="company_id"
          defaultValue={companyId ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.legal_name}
            </option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinancialCard label="Saldo inicial cadastrado" value={formatBRL(initialBalance)} />
        <FinancialCard label="Entradas realizadas" value={formatBRL(totalInflowsRealized)} tone="positive" />
        <FinancialCard label="Saídas realizadas" value={formatBRL(totalOutflowsRealized)} tone="negative" />
      </div>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Horizonte</th>
              <th className="text-left px-4 py-3">Entradas previstas</th>
              <th className="text-left px-4 py-3">Saídas previstas</th>
              <th className="text-left px-4 py-3">Saldo projetado</th>
            </tr>
          </thead>
          <tbody>
            {horizonRows.map((row) => (
              <tr key={row.label} className="border-t border-ps-navy/5">
                <td className="px-4 py-3 font-medium text-ps-ink">{row.label}</td>
                <td className="px-4 py-3 tabular-nums text-ps-green-700">{formatBRL(row.inflows)}</td>
                <td className="px-4 py-3 tabular-nums text-red-600">{formatBRL(row.outflows)}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{formatBRL(row.projectedBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Saldo atual = saldo inicial cadastrado + entradas realizadas − saídas realizadas (todo o histórico).
        Saldo projetado considera pagamentos programados (fixos e programados) e receitas estimadas/confirmadas
        ponderadas pela probabilidade, com data prevista dentro do horizonte.
      </p>
    </div>
  );
}

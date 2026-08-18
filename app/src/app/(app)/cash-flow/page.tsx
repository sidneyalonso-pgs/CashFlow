import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { getWeekBuckets, getMonthBuckets, getQuarterBuckets, shiftDay, type Bucket } from "@/lib/calculations/cashflowPeriods";
import { scopeAccounts, transferDirection } from "@/lib/calculations/transfers";
import { eliminarIntercompany } from "@/lib/calculations/intercompany";

type Granularity = "semana" | "mes" | "trimestre";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: { company_id?: string; visao?: string; ano?: string; mes?: string; pagamentos?: string; bank_account_id?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;
  const bankAccountId = searchParams.bank_account_id;
  const granularity: Granularity =
    searchParams.visao === "mes" || searchParams.visao === "trimestre" ? (searchParams.visao as Granularity) : "semana";
  // realizados = só baixados; provisionados = só futuros/pendentes; ambos = os dois
  const pagamentosFiltro = searchParams.pagamentos === "provisionados" ? "provisionados"
    : searchParams.pagamentos === "ambos" ? "ambos"
    : "realizados";

  const today = new Date();
  const year = Number(searchParams.ano) || today.getFullYear();
  const month = Number(searchParams.mes) || today.getMonth() + 1;

  const buckets: Bucket[] =
    granularity === "semana" ? getWeekBuckets(year, month) : granularity === "mes" ? getMonthBuckets(year) : getQuarterBuckets(year);

  const rangeStart = buckets[0].start;
  const rangeEnd = buckets[buckets.length - 1].end;

  let bankAccountsQuery = supabase.from("bank_accounts").select("id, nickname, bank_name, initial_balance, counts_as_available_cash, company_id");
  let paymentRealizationsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(id, company_id, paying_bank_account_id)")
    .is("payments.deleted_at", null);
  let provisionedQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id, paying_bank_account_id")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")');
  // receita ainda não recebida (ex.: fatura de bets/mensalidade emitida) = valor a receber
  let provisionedRevenuesQuery = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id, receiving_bank_account_id")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")');
  let revenueRealizationsQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(id, company_id, receiving_bank_account_id)")
    .is("revenues.deleted_at", null);
  let investmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id, bank_account_id, is_opening_balance");

  // Transferências: pix/TED recebido = entrada; pix/TED enviado + débitos = saída
  let transfersQuery = supabase
    .from("transfers")
    .select("id, tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id, description, counterpart_name")
    .gte("transfer_date", "2020-01-01")
    .lte("transfer_date", rangeEnd);

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    paymentRealizationsQuery = paymentRealizationsQuery.eq("payments.company_id", companyId);
    provisionedQuery = provisionedQuery.eq("company_id", companyId);
    provisionedRevenuesQuery = provisionedRevenuesQuery.eq("company_id", companyId);
    revenueRealizationsQuery = revenueRealizationsQuery.eq("revenues.company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
    // transferência entre empresas do grupo precisa aparecer nos dois lados: quem enviou
    // (company_id) e quem recebeu (to_company_id)
    transfersQuery = transfersQuery.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);
  }

  const [{ data: allBankAccounts }, { data: paymentRealizationsRaw }, { data: provisionedPaymentsRaw }, { data: revenueRealizationsRaw }, { data: provisionedRevenuesRaw }, { data: investmentsDataRaw }, { data: transfersRaw }, { data: companies }, { data: icTransf }, { data: icRev }, { data: icPay }] =
    await Promise.all([
      bankAccountsQuery,
      // busca sempre os dois: a provisão tem coluna própria na tabela, então precisa estar
      // disponível mesmo quando o filtro deixa o saldo só com o realizado
      paymentRealizationsQuery,
      provisionedQuery,
      revenueRealizationsQuery,
      provisionedRevenuesQuery,
      investmentsQuery,
      transfersQuery,
      supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
      // Pernas de movimento entre empresas do grupo, em consultas próprias e com o erro
      // tolerado: a coluna só existe depois da migration 0019. Só as vinculadas interessam.
      supabase.from("transfers").select("id, company_id, intercompany_ref, from_account_id, to_account_id").not("intercompany_ref", "is", null),
      supabase.from("revenues").select("id, company_id, intercompany_ref").not("intercompany_ref", "is", null),
      supabase.from("payments").select("id, company_id, intercompany_ref").not("intercompany_ref", "is", null),
    ]);

  // Filtrar por conta bancária se selecionada
  const bankAccounts = bankAccountId
    ? (allBankAccounts ?? []).filter((a: any) => a.id === bankAccountId)
    : (allBankAccounts ?? []);
  const paymentRealizationsEscopo = bankAccountId
    ? (paymentRealizationsRaw ?? []).filter((r: any) => (r.payments as any)?.paying_bank_account_id === bankAccountId)
    : (paymentRealizationsRaw ?? []);
  const provisionedPayments = bankAccountId
    ? (provisionedPaymentsRaw ?? []).filter((p: any) => p.paying_bank_account_id === bankAccountId)
    : (provisionedPaymentsRaw ?? []);
  const revenueRealizationsEscopo = bankAccountId
    ? (revenueRealizationsRaw ?? []).filter((r: any) => (r.revenues as any)?.receiving_bank_account_id === bankAccountId)
    : (revenueRealizationsRaw ?? []);
  const provisionedRevenues = bankAccountId
    ? (provisionedRevenuesRaw ?? []).filter((r: any) => r.receiving_bank_account_id === bankAccountId)
    : (provisionedRevenuesRaw ?? []);
  const investmentsData = bankAccountId
    ? (investmentsDataRaw ?? []).filter((i: any) => i.bank_account_id === bankAccountId)
    : (investmentsDataRaw ?? []);

  // Movimento entre empresas do grupo: as duas pernas saem juntas do bruto quando as duas
  // estão no escopo. O saldo não muda — sai uma entrada e uma saída de igual valor.
  const empresasNoEscopo = new Set<string>(
    companyId ? [companyId] : ((companies ?? []) as any[]).map((c) => c.id)
  );
  const empresaDaConta = new Map<string, string>(((allBankAccounts ?? []) as any[]).map((a) => [a.id, a.company_id]));
  const { ignorar: icIgnorar, movimentos: icMovimentos } = eliminarIntercompany(
    [
      ...((icTransf ?? []) as any[]).map((t) => ({
        tabela: "transfers" as const,
        id: t.id,
        ref: t.intercompany_ref,
        // a empresa da perna é a dona da conta que se mexeu, não necessariamente company_id
        companyId: empresaDaConta.get(t.from_account_id) ?? empresaDaConta.get(t.to_account_id) ?? t.company_id,
      })),
      ...((icRev ?? []) as any[]).map((r) => ({ tabela: "revenues" as const, id: r.id, ref: r.intercompany_ref, companyId: r.company_id })),
      ...((icPay ?? []) as any[]).map((p) => ({ tabela: "payments" as const, id: p.id, ref: p.intercompany_ref, companyId: p.company_id })),
    ],
    empresasNoEscopo
  );

  const paymentRealizations = (paymentRealizationsEscopo ?? []).filter(
    (r: any) => !icIgnorar.payments.has(r.payments?.id)
  );
  const revenueRealizations = (revenueRealizationsEscopo ?? []).filter(
    (r: any) => !icIgnorar.revenues.has(r.revenues?.id)
  );

  // Transferências: a conta de origem/destino define a direção dentro do escopo selecionado
  const scopeAccountIds = scopeAccounts(bankAccountId, (allBankAccounts ?? []) as { id: string }[]);
  const { isInflow: isTransferIn, isOutflow: isTransferOut } = transferDirection(scopeAccountIds, companyId);
  const allTransfers = ((transfersRaw ?? []) as any[]).filter((t) => !icIgnorar.transfers.has(t.id)) as Array<{ id: string; tipo: string; amount: number; transfer_date: string; company_id: string | null; to_company_id: string | null; from_account_id: string | null; to_account_id: string | null; counterpart_name: string | null; description: string | null }>;

  const transferInflows = allTransfers
    .filter(isTransferIn)
    .map((t) => ({ amount: Number(t.amount), received_at: t.transfer_date }));
  const transferOutflows = allTransfers
    .filter(isTransferOut)
    .map((t) => ({ amount: Number(t.amount), paid_at: t.transfer_date }));

  const initialCashBalance = sumMoney(
    (bankAccounts ?? []).filter((a: any) => a.counts_as_available_cash).map((a: any) => a.initial_balance)
  );

  type InvRow = { tipo: string; applied_amount: number; applied_date: string; is_opening_balance: boolean };
  const allInvestments = (investmentsData ?? []) as InvRow[];

  // Aplicações que debitam C/C (excluindo saldo inicial pré-existente)
  const invOutflows = allInvestments
    .filter((i) => i.tipo === "aplicacao" && !i.is_opening_balance)
    .map((i) => ({ amount: Number(i.applied_amount), paid_at: i.applied_date }));

  // Resgates creditam C/C
  const invInflows = allInvestments
    .filter((i) => i.tipo === "resgate")
    .map((i) => ({ amount: Number(i.applied_amount), received_at: i.applied_date }));

  const provisionedOutflows = (provisionedPayments ?? []).map((p: any) => ({
    amount: Number(p.gross_amount),
    paid_at: p.due_date,
  }));

  const outflows = [
    ...((paymentRealizations ?? []) as Array<{ amount: number; paid_at: string }>),
    ...invOutflows,
    ...transferOutflows,
  ];
  const provisionedInflows = (provisionedRevenues ?? []).map((r: any) => ({
    amount: Number(r.expected_amount),
    received_at: r.expected_date,
  }));

  // Entradas/Saídas são sempre só o realizado e a provisão fica só em "A receber"/"A pagar" —
  // as colunas nunca mostram o mesmo valor duas vezes. O filtro decide apenas se o saldo é o
  // realizado (bate com o extrato) ou o projetado (somando as provisões do período).
  const projetado = pagamentosFiltro !== "realizados";

  const inflows = [
    ...((revenueRealizations ?? []) as Array<{ amount: number; received_at: string }>),
    ...invInflows,
    ...transferInflows,
  ];

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

  // provisões sempre visíveis em coluna própria, independente do filtro
  const provInflowDates = provisionedInflows.map((i) => i.received_at);
  const provOutflowDates = provisionedOutflows.map((o: any) => o.paid_at);

  const bucketRows = buckets.map((b) => {
    const bucketInflows = sumInRange(inflows, inflowDates, b.start, b.end);
    const bucketOutflows = sumInRange(outflows, outflowDates, b.start, b.end);
    const bucketProvInflows = sumInRange(provisionedInflows, provInflowDates, b.start, b.end);
    const bucketProvOutflows = sumInRange(provisionedOutflows, provOutflowDates, b.start, b.end);

    runningBalance = runningBalance.plus(bucketInflows).minus(bucketOutflows);
    if (projetado) runningBalance = runningBalance.plus(bucketProvInflows).minus(bucketProvOutflows);

    const bucketInvDelta = allInvestments
      .filter((_, idx) => invDates[idx] >= b.start && invDates[idx] <= b.end)
      .reduce((acc, i) => acc + (i.tipo === "aplicacao" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);
    runningInvBalance += bucketInvDelta;

    return {
      ...b,
      inflows: bucketInflows,
      outflows: bucketOutflows,
      provInflows: bucketProvInflows,
      provOutflows: bucketProvOutflows,
      balance: runningBalance,
      invBalance: runningInvBalance,
    };
  });

  const totalProvInflows = sumMoney(bucketRows.map((r) => r.provInflows));
  const totalProvOutflows = sumMoney(bucketRows.map((r) => r.provOutflows));
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
      <PageHeader
        title="Cash Flow"
        subtitle="Resumo executivo e evolução do saldo de caixa"
        actions={
          <Link
            href="/cash-flow/detalhado"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Ver Cash Flow Detalhado
          </Link>
        }
      />

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-6">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
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
        <select name="visao" defaultValue={granularity} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="semana">Por semana</option>
          <option value="mes">Por mês</option>
          <option value="trimestre">Por trimestre</option>
        </select>
        <select name="pagamentos" defaultValue={projetado ? "ambos" : "realizados"} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="realizados">Saldo realizado</option>
          <option value="ambos">Saldo projetado (+ provisões)</option>
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
      </AutoSubmitForm>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <FinancialCard label={`Saldo C/C Inicial (${formatShort(rangeStart)})`} value={formatBRL(openingBalance)} />
        <FinancialCard label="Total de Entradas" value={formatBRL(totalInflows)} tone="positive" />
        <FinancialCard label="Total de Saídas" value={formatBRL(totalOutflows)} tone="negative" />
        <FinancialCard
          label={`${projetado ? "Saldo C/C projetado" : "Saldo C/C"} (${formatShort(rangeEnd)})`}
          value={formatBRL(closingBalance)}
          tone={closingBalance.isNegative() ? "negative" : "neutral"}
        />
      </div>

      {(!totalProvInflows.isZero() || !totalProvOutflows.isZero()) && (
        <p className="text-xs text-ps-muted mb-6">
          No período ainda há{" "}
          <strong className="text-amber-700">{formatBRL(totalProvInflows)} a receber</strong> e{" "}
          <strong className="text-amber-700">{formatBRL(totalProvOutflows)} a pagar</strong> —{" "}
          {projetado
            ? "já somados no saldo projetado."
            : "fora do saldo acima, que mostra só o realizado. Troque para “Saldo projetado” para incluí-los."}
        </p>
      )}

      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-semibold text-ps-ink">
          Evolução do Saldo — {granularity === "semana" ? "Semanal" : granularity === "mes" ? "Mensal" : "Trimestral"}
        </h3>
        {projetado && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-2 py-0.5">
            Saldo projetado (com provisões)
          </span>
        )}
      </div>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Período</th>
              <th className="text-left px-4 py-3">Entradas</th>
              <th className="text-left px-4 py-3 text-amber-700">A receber</th>
              <th className="text-left px-4 py-3">Saídas</th>
              <th className="text-left px-4 py-3 text-amber-700">A pagar</th>
              <th className="text-left px-4 py-3">{projetado ? "Saldo C/C projetado" : "Saldo C/C"}</th>
              <th className="text-left px-4 py-3 text-ps-navy/70">Saldo C/C + Invest</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ps-navy/5 bg-ps-bg-2/40">
              <td className="px-4 py-3 font-medium text-ps-ink">Saldo Inicial ({formatShort(rangeStart)})</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 tabular-nums font-semibold">{formatBRL(openingBalance)}</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-ps-navy/70">{formatBRL(openingBalance.toNumber() + openingInvBalance)}</td>
            </tr>
            {bucketRows.map((row) => {
              const detailHref = `/cash-flow/detalhe?start=${row.start}&end=${row.end}&label=${encodeURIComponent(row.label)}${
                companyId ? `&company_id=${companyId}` : ""
              }${bankAccountId ? `&bank_account_id=${bankAccountId}` : ""}`;
              const totalWithInv = row.balance.toNumber() + row.invBalance;
              return (
                <tr key={row.label} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40">
                  <td className="px-4 py-3 font-medium">
                    <Link href={detailHref} className="text-ps-navy hover:underline">
                      {row.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ps-green-700">{formatBRL(row.inflows)}</td>
                  <td className="px-4 py-3 tabular-nums text-amber-700">
                    {row.provInflows.isZero() ? <span className="text-ps-muted">—</span> : formatBRL(row.provInflows)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-red-600">{formatBRL(row.outflows)}</td>
                  <td className="px-4 py-3 tabular-nums text-amber-700">
                    {row.provOutflows.isZero() ? <span className="text-ps-muted">—</span> : formatBRL(row.provOutflows)}
                  </td>
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
        {icMovimentos > 0 && (
          <>
            {icMovimentos} movimento{icMovimentos > 1 ? "s" : ""} entre empresas do grupo {icMovimentos > 1 ? "foram" : "foi"} eliminado
            {icMovimentos > 1 ? "s" : ""} das entradas e saídas — as duas pernas saíram juntas, então o saldo não muda.{" "}
            <Link href="/conciliacao/intercompany" className="text-ps-navy underline">Ver vínculos</Link>.{" "}
          </>
        )}
        Saldo inicial do período = saldo cadastrado nas contas bancárias + todas as entradas e saídas realizadas
        até o dia anterior ao início do período selecionado. Entradas e Saídas são o que já foi baixado;
        “A receber” e “A pagar” são as provisões com vencimento naquele intervalo e aparecem sempre, mas só
        entram no saldo quando o filtro está em “Provisionados” ou “Ambos”.
      </p>

    </div>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}`;
}

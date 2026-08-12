import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { DetalhadoTable, type DayRow } from "./DetalhadoTable";

const TRANSFER_LABELS: Record<string, string> = {
  pix_enviado: "Pix enviado",
  pix_recebido: "Pix recebido",
  ted_enviado: "TED enviado",
  ted_recebido: "TED recebido",
  reembolso: "Reembolso",
  debito_bancario: "Débito bancário",
  transferencia_interna: "Transferência entre contas",
};

function groupSum(items: Array<{ label: string; amount: number }>): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const it of items) {
    map.set(it.label, (map.get(it.label) ?? 0) + it.amount);
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

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
    .select("id, nickname, bank_name, initial_balance, blocked_balance, counts_as_available_cash, company_id");
  let paymentRealizationsQuery = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, paying_bank_account_id, description, suppliers(legal_name))")
    .is("payments.deleted_at", null)
    .gte("paid_at", dateFrom)
    .lte("paid_at", dateTo);
  let provisionedPaymentsQuery = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id, paying_bank_account_id, description, suppliers(legal_name)")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")')
    .gte("due_date", dateFrom)
    .lte("due_date", dateTo);
  let revenueRealizationsQuery = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id, receiving_bank_account_id, description, categories(name))")
    .is("revenues.deleted_at", null)
    .gte("received_at", dateFrom)
    .lte("received_at", dateTo);
  let provisionedRevenuesQuery = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id, receiving_bank_account_id, description, categories(name)")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")')
    .gte("expected_date", dateFrom)
    .lte("expected_date", dateTo);
  let investmentsQuery = supabase
    .from("investments")
    .select("tipo, applied_amount, applied_date, company_id, bank_account_id, is_opening_balance")
    .gte("applied_date", dateFrom)
    .lte("applied_date", dateTo);
  let transfersQuery = supabase
    .from("transfers")
    .select("tipo, amount, transfer_date, description, counterpart_name, company_id, from_account_id, to_account_id")
    .gte("transfer_date", dateFrom)
    .lte("transfer_date", dateTo);

  if (companyId) {
    bankAccountsQuery = bankAccountsQuery.eq("company_id", companyId);
    paymentRealizationsQuery = paymentRealizationsQuery.eq("payments.company_id", companyId);
    provisionedPaymentsQuery = provisionedPaymentsQuery.eq("company_id", companyId);
    revenueRealizationsQuery = revenueRealizationsQuery.eq("revenues.company_id", companyId);
    provisionedRevenuesQuery = provisionedRevenuesQuery.eq("company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
    transfersQuery = transfersQuery.eq("company_id", companyId);
  }

  const [
    { data: allBankAccounts },
    { data: paymentRealizationsRaw },
    { data: provisionedPaymentsRaw },
    { data: revenueRealizationsRaw },
    { data: provisionedRevenuesRaw },
    { data: investmentsRaw },
    { data: transfersRaw },
    { data: companies },
  ] = await Promise.all([
    bankAccountsQuery,
    paymentRealizationsQuery,
    provisionedPaymentsQuery,
    revenueRealizationsQuery,
    provisionedRevenuesQuery,
    investmentsQuery,
    transfersQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const paymentRealizations = bankAccountId
    ? (paymentRealizationsRaw ?? []).filter((r: any) => (r.payments as any)?.paying_bank_account_id === bankAccountId)
    : (paymentRealizationsRaw ?? []);
  const provisionedPayments = bankAccountId
    ? (provisionedPaymentsRaw ?? []).filter((p: any) => p.paying_bank_account_id === bankAccountId)
    : (provisionedPaymentsRaw ?? []);
  const revenueRealizations = bankAccountId
    ? (revenueRealizationsRaw ?? []).filter((r: any) => (r.revenues as any)?.receiving_bank_account_id === bankAccountId)
    : (revenueRealizationsRaw ?? []);
  const provisionedRevenues = bankAccountId
    ? (provisionedRevenuesRaw ?? []).filter((r: any) => r.receiving_bank_account_id === bankAccountId)
    : (provisionedRevenuesRaw ?? []);
  const investments = bankAccountId
    ? (investmentsRaw ?? []).filter((i: any) => i.bank_account_id === bankAccountId)
    : (investmentsRaw ?? []);

  // Transferências: mesma classificação do resumo executivo
  const INFLOW_TIPOS = ["pix_recebido", "ted_recebido"];
  const OUTFLOW_TIPOS = ["pix_enviado", "ted_enviado", "debito_bancario", "reembolso"];
  const allTransfers = (transfersRaw ?? []) as any[];
  const transferOutflows = allTransfers.filter(
    (t) =>
      (OUTFLOW_TIPOS.includes(t.tipo) && (!bankAccountId || t.from_account_id === bankAccountId)) ||
      (t.tipo === "transferencia_interna" && bankAccountId && t.from_account_id === bankAccountId)
  );
  const transferInflows = allTransfers.filter(
    (t) =>
      (INFLOW_TIPOS.includes(t.tipo) && (!bankAccountId || t.to_account_id === bankAccountId)) ||
      (t.tipo === "transferencia_interna" && bankAccountId && t.to_account_id === bankAccountId)
  );

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
  let priorTransfersQuery = supabase
    .from("transfers")
    .select("tipo, amount, transfer_date, company_id, from_account_id, to_account_id")
    .lt("transfer_date", dateFrom);
  if (companyId) {
    priorPaymentsQuery = priorPaymentsQuery.eq("payments.company_id", companyId);
    priorRevenuesQuery = priorRevenuesQuery.eq("revenues.company_id", companyId);
    priorInvestmentsQuery = priorInvestmentsQuery.eq("company_id", companyId);
    priorTransfersQuery = priorTransfersQuery.eq("company_id", companyId);
  }
  const [{ data: priorPaymentsRaw }, { data: priorRevenuesRaw }, { data: priorInvestmentsRaw }, { data: priorTransfersRaw }] =
    await Promise.all([priorPaymentsQuery, priorRevenuesQuery, priorInvestmentsQuery, priorTransfersQuery]);
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
  const blockedBalance = sumMoney(
    (bankAccountId ? (allBankAccounts ?? []).filter((a: any) => a.id === bankAccountId) : allBankAccounts ?? []).map(
      (a: any) => a.blocked_balance ?? 0
    )
  ).toNumber();
  const priorInflows = sumMoney(priorRevenues.map((r: any) => r.amount));
  const priorOutflows = sumMoney(priorPayments.map((p: any) => p.amount));
  const priorInvNet = sumMoney(
    priorInvestments
      .filter((i: any) => !i.is_opening_balance)
      .map((i: any) => (i.tipo === "resgate" ? Number(i.applied_amount) : -Number(i.applied_amount)))
  );

  const allPriorTransfers = (priorTransfersRaw ?? []) as any[];
  const priorTransferNet = sumMoney(
    allPriorTransfers.map((t: any) => {
      const isOut =
        (OUTFLOW_TIPOS.includes(t.tipo) && (!bankAccountId || t.from_account_id === bankAccountId)) ||
        (t.tipo === "transferencia_interna" && bankAccountId && t.from_account_id === bankAccountId);
      const isIn =
        (INFLOW_TIPOS.includes(t.tipo) && (!bankAccountId || t.to_account_id === bankAccountId)) ||
        (t.tipo === "transferencia_interna" && bankAccountId && t.to_account_id === bankAccountId);
      if (isOut) return -Number(t.amount);
      if (isIn) return Number(t.amount);
      return 0;
    })
  );

  const openingBalance = initialCashBalance
    .plus(priorInflows)
    .minus(priorOutflows)
    .plus(priorInvNet)
    .plus(priorTransferNet)
    .toNumber();

  // saldo investido inicial: todo aplicação/resgate anterior ao período, incluindo os marcados
  // como saldo de abertura (eles representam principal já investido, não um movimento de caixa novo)
  const openingInvestedBalance = sumMoney(
    priorInvestments.map((i: any) => (i.tipo === "resgate" ? -Number(i.applied_amount) : Number(i.applied_amount)))
  ).toNumber();

  // agrupar por dia
  const days: string[] = [];
  for (let d = new Date(dateFrom + "T00:00:00Z"); d.toISOString().slice(0, 10) <= dateTo; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  let runningBalance = openingBalance;
  let cumulativeProvisaoSaidas = 0;
  let cumulativeProvisaoEntradas = 0;
  let cumulativeInvested = openingInvestedBalance;

  const dayRows: DayRow[] = days.map((day) => {
    const saidasItems = paymentRealizations
      .filter((p: any) => p.paid_at === day)
      .map((p: any) => ({ label: p.payments?.suppliers?.legal_name ?? p.payments?.description ?? "Outros", amount: Number(p.amount) }));
    const provisaoSaidasItems = provisionedPayments
      .filter((p: any) => p.due_date === day)
      .map((p: any) => ({ label: p.suppliers?.legal_name ?? p.description ?? "Outros", amount: Number(p.gross_amount) }));
    const entradasItems = revenueRealizations
      .filter((r: any) => r.received_at === day)
      .map((r: any) => ({ label: r.revenues?.categories?.name ?? r.revenues?.description ?? "Outras", amount: Number(r.amount) }));
    const provisaoEntradasItems = provisionedRevenues
      .filter((r: any) => r.expected_date === day)
      .map((r: any) => ({ label: r.categories?.name ?? r.description ?? "Outras", amount: Number(r.expected_amount) }));

    // transferências entram como saída/entrada realizada, igual ao resumo executivo
    saidasItems.push(
      ...transferOutflows
        .filter((t: any) => t.transfer_date === day)
        .map((t: any) => ({
          label: t.counterpart_name ?? t.description ?? TRANSFER_LABELS[t.tipo] ?? "Transferência",
          amount: Number(t.amount),
        }))
    );
    entradasItems.push(
      ...transferInflows
        .filter((t: any) => t.transfer_date === day)
        .map((t: any) => ({
          label: t.counterpart_name ?? t.description ?? TRANSFER_LABELS[t.tipo] ?? "Transferência",
          amount: Number(t.amount),
        }))
    );

    const saidas = sumMoney(saidasItems.map((i) => i.amount)).toNumber();
    const provisaoSaidas = sumMoney(provisaoSaidasItems.map((i) => i.amount)).toNumber();
    const entradas = sumMoney(entradasItems.map((i) => i.amount)).toNumber();
    const provisaoEntradas = sumMoney(provisaoEntradasItems.map((i) => i.amount)).toNumber();
    // efeito no caixa (aplicação tira dinheiro da conta, resgate devolve) — usado só pra calcular o saldo
    const investimentoCashEffect = investments
      .filter((i: any) => i.applied_date === day && !i.is_opening_balance)
      .reduce((acc: number, i: any) => acc + (i.tipo === "resgate" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);
    // valor exibido: positivo quando aplicou mais do que resgatou no dia (visão de investimento, não de caixa)
    const investimento = -investimentoCashEffect;

    // saldo investido: soma de tudo aplicado menos resgatado até esse dia, incluindo entradas
    // marcadas como saldo de abertura (não são movimento de caixa, mas são principal investido)
    const investedDelta = investments
      .filter((i: any) => i.applied_date === day)
      .reduce((acc: number, i: any) => acc + (i.tipo === "resgate" ? -Number(i.applied_amount) : Number(i.applied_amount)), 0);
    cumulativeInvested += investedDelta;

    // saldo em conta ainda não afetado por provisões — só saídas/entradas já baixadas e investimentos
    runningBalance = runningBalance - saidas + entradas + investimentoCashEffect;

    // "saldo da conta": saldo realizado, descontando as provisões (saída e entrada) acumuladas até
    // esse dia. O saldo bloqueado NÃO é descontado aqui — ele já faz parte do saldo bancário real,
    // só é exibido separadamente (card "Saldo bloqueado") como informação.
    cumulativeProvisaoSaidas += provisaoSaidas;
    cumulativeProvisaoEntradas += provisaoEntradas;
    const saldoConta = runningBalance - cumulativeProvisaoSaidas + cumulativeProvisaoEntradas;

    // "saldo projetado": saldo da conta (acima) + tudo que está investido — visão de patrimônio total
    const saldoProjetado = saldoConta + cumulativeInvested;

    return {
      day,
      saidas,
      provisaoSaidas,
      entradas,
      provisaoEntradas,
      investimento,
      saldo: saldoConta,
      saldoProjetado,
      saidasDetail: groupSum(saidasItems),
      provisaoSaidasDetail: groupSum(provisaoSaidasItems),
      entradasDetail: groupSum(entradasItems),
      provisaoEntradasDetail: groupSum(provisaoEntradasItems),
    };
  });

  const totalSaidas = sumMoney(dayRows.map((r) => r.saidas));
  const totalProvisaoSaidas = sumMoney(dayRows.map((r) => r.provisaoSaidas));
  const totalEntradas = sumMoney(dayRows.map((r) => r.entradas));
  const totalProvisaoEntradas = sumMoney(dayRows.map((r) => r.provisaoEntradas));
  const totalInvestimento = sumMoney(dayRows.map((r) => r.investimento));

  // saldo total = saldo bancário real no fim do período (sem descontar provisão, igual o extrato do banco)
  const saldoTotalFinal = openingBalance + totalEntradas.toNumber() - totalSaidas.toNumber() - totalInvestimento.toNumber();
  const saldoDisponivel = saldoTotalFinal - blockedBalance;

  return (
    <div>
      <PageHeader
        title="Cash Flow Detalhado"
        subtitle="Saídas, entradas, provisões e investimentos por dia"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <FinancialCard label="Saídas" value={formatBRL(totalSaidas)} tone="negative" />
        <FinancialCard label="Provisão de saídas" value={formatBRL(totalProvisaoSaidas)} />
        <FinancialCard label="Entradas" value={formatBRL(totalEntradas)} tone="positive" />
        <FinancialCard label="Provisão de entradas" value={formatBRL(totalProvisaoEntradas)} />
        <FinancialCard
          label="Total investido"
          value={formatBRL(cumulativeInvested)}
          tone={cumulativeInvested < 0 ? "negative" : cumulativeInvested > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinancialCard label="Saldo disponível" value={formatBRL(saldoDisponivel)} tone={saldoDisponivel < 0 ? "negative" : "positive"} />
        <FinancialCard label="Saldo bloqueado" value={formatBRL(blockedBalance)} tone="neutral" />
        <FinancialCard label="Saldo total" value={formatBRL(saldoTotalFinal)} tone={saldoTotalFinal < 0 ? "negative" : "positive"} />
      </div>

      <DetalhadoTable
        openingSaldoConta={openingBalance}
        openingSaldoProjetado={openingBalance + openingInvestedBalance}
        dateFrom={dateFrom}
        rows={dayRows}
      />

      <p className="text-xs text-ps-muted mt-4">
        Clique em um dia para ver o detalhamento por fornecedor. Saídas/entradas = pagamentos e receitas já baixados
        na data. Provisão de saídas/entradas = valores com vencimento/previsão na data mas ainda não baixados.
        Total investido = histórico acumulado de tudo que está aplicado até o fim do período (aplicações menos
        resgates desde o início), não só o líquido do mês — por isso não some nem fica negativo num mês em que só
        houve resgate. Saldo total = saldo bancário real no fim do período (igual ao extrato do banco, com o
        bloqueado incluído). Saldo disponível = saldo total menos o bloqueado. Na tabela abaixo, Saldo da conta =
        saldo realizado descontando as provisões (saídas e entradas) acumuladas até aquele dia — estimativa de caixa
        livre após os pagamentos e recebimentos previstos. Saldo C/C + Investimentos = saldo da conta + tudo o que
        está investido — visão de patrimônio total, caixa livre + investimentos.
      </p>
    </div>
  );
}

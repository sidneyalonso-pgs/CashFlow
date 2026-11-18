import { createClient } from "@/lib/supabase/server";
import { sumMoney } from "./money";
import { scopeAccounts, transferDirection } from "./transfers";

/**
 * Saldo real de uma conta bancária até (e incluindo) uma data — mesma fórmula usada no saldo
 * inicial do Cash Flow Detalhado: saldo cadastrado + tudo que já foi realizado (pagamentos,
 * receitas, investimentos, transferências) até a data, filtrado pra essa conta específica.
 */
export async function getAccountBalanceAsOf(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  companyId: string,
  asOfDate: string
): Promise<number> {
  const [{ data: account }, { data: paymentRealizations }, { data: revenueRealizations }, { data: investments }, { data: transfersRaw }] =
    await Promise.all([
      supabase.from("bank_accounts").select("initial_balance").eq("id", accountId).single(),
      supabase
        .from("payment_realizations")
        .select("amount, paid_at, payments!inner(paying_bank_account_id, deleted_at)")
        .eq("payments.paying_bank_account_id", accountId)
        .is("payments.deleted_at", null).in("payments.status", ["pago", "pago_parcialmente"])
        .lte("paid_at", asOfDate),
      supabase
        .from("revenue_realizations")
        .select("amount, received_at, revenues!inner(receiving_bank_account_id, deleted_at)")
        .eq("revenues.receiving_bank_account_id", accountId)
        .is("revenues.deleted_at", null).eq("revenues.status", "recebida")
        .lte("received_at", asOfDate),
      supabase
        .from("investments")
        .select("tipo, applied_amount, applied_date, is_opening_balance")
        .eq("bank_account_id", accountId)
        .lte("applied_date", asOfDate),
      supabase
        .from("transfers")
        .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id")
        .or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`)
        .lte("transfer_date", asOfDate),
    ]);

  const initial = Number(account?.initial_balance ?? 0);
  const outflows = sumMoney((paymentRealizations ?? []).map((r: any) => r.amount)).toNumber();
  const inflows = sumMoney((revenueRealizations ?? []).map((r: any) => r.amount)).toNumber();

  const invNet = (investments ?? [])
    .filter((i: any) => !i.is_opening_balance)
    .reduce((acc: number, i: any) => acc + (i.tipo === "resgate" ? Number(i.applied_amount) : -Number(i.applied_amount)), 0);

  const scopeAccountIds = scopeAccounts(accountId, [{ id: accountId }]);
  const { isInflow, isOutflow } = transferDirection(scopeAccountIds, companyId);
  let transferNet = 0;
  for (const t of (transfersRaw ?? []) as any[]) {
    if (isOutflow(t)) transferNet -= Number(t.amount);
    if (isInflow(t)) transferNet += Number(t.amount);
  }

  return initial + inflows - outflows + invNet + transferNet;
}

/**
 * Total de saídas de uma conta em UM dia específico — as "retiradas": transferências de saída
 * mais pagamentos pagos por essa conta (ex.: "Saídas Operacionais - SPB"), o mesmo total que o
 * Cash Flow Detalhado mostra como saídas do dia.
 */
export async function getAccountOutflowsOnDay(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  companyId: string,
  date: string
): Promise<number> {
  const [{ data: transfersRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from("transfers")
      .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id")
      .or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`)
      .eq("transfer_date", date),
    supabase
      .from("payment_realizations")
      .select("amount, payments!inner(paying_bank_account_id, deleted_at)")
      .eq("payments.paying_bank_account_id", accountId)
      .is("payments.deleted_at", null).in("payments.status", ["pago", "pago_parcialmente"])
      .eq("paid_at", date),
  ]);

  const scopeAccountIds = scopeAccounts(accountId, [{ id: accountId }]);
  const { isOutflow } = transferDirection(scopeAccountIds, companyId);
  const transfers = sumMoney(((transfersRaw ?? []) as any[]).filter(isOutflow).map((t: any) => t.amount));
  const payments = sumMoney(((paymentsRaw ?? []) as any[]).map((p: any) => p.amount));
  return transfers.plus(payments).toNumber();
}

/**
 * Movimento LÍQUIDO de uma conta por dia, entre duas datas (inclusive), com a mesma regra do saldo
 * (`getAccountBalanceAsOf`): receitas recebidas e pagamentos pagos filtrados pela conta do lançamento,
 * investimentos e transferências pela direção da conta. Serve pra comparar, dia a dia, com o extrato.
 */
export async function getAccountDailyMovements(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  companyId: string,
  fromDate: string,
  toDate: string
): Promise<Record<string, { inflow: number; outflow: number }>> {
  const [{ data: paymentRealizations }, { data: revenueRealizations }, { data: investments }, { data: transfersRaw }] =
    await Promise.all([
      supabase
        .from("payment_realizations")
        .select("amount, paid_at, payments!inner(paying_bank_account_id, deleted_at)")
        .eq("payments.paying_bank_account_id", accountId)
        .is("payments.deleted_at", null).in("payments.status", ["pago", "pago_parcialmente"])
        .gte("paid_at", fromDate).lte("paid_at", toDate),
      supabase
        .from("revenue_realizations")
        .select("amount, received_at, revenues!inner(receiving_bank_account_id, deleted_at)")
        .eq("revenues.receiving_bank_account_id", accountId)
        .is("revenues.deleted_at", null).eq("revenues.status", "recebida")
        .gte("received_at", fromDate).lte("received_at", toDate),
      supabase
        .from("investments")
        .select("tipo, applied_amount, applied_date, is_opening_balance")
        .eq("bank_account_id", accountId)
        .gte("applied_date", fromDate).lte("applied_date", toDate),
      supabase
        .from("transfers")
        .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id")
        .or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`)
        .gte("transfer_date", fromDate).lte("transfer_date", toDate),
    ]);

  const days: Record<string, { inflow: number; outflow: number }> = {};
  const day = (d: string) => (days[d] ??= { inflow: 0, outflow: 0 });

  for (const r of (revenueRealizations ?? []) as any[]) day(r.received_at).inflow += Number(r.amount);
  for (const r of (paymentRealizations ?? []) as any[]) day(r.paid_at).outflow += Number(r.amount);
  for (const i of (investments ?? []) as any[]) {
    if (i.is_opening_balance) continue;
    if (i.tipo === "resgate") day(i.applied_date).inflow += Number(i.applied_amount);
    else day(i.applied_date).outflow += Number(i.applied_amount);
  }
  const { isInflow, isOutflow } = transferDirection(scopeAccounts(accountId, [{ id: accountId }]), companyId);
  for (const t of (transfersRaw ?? []) as any[]) {
    if (isOutflow(t)) day(t.transfer_date).outflow += Number(t.amount);
    if (isInflow(t)) day(t.transfer_date).inflow += Number(t.amount);
  }

  for (const d of Object.values(days)) {
    d.inflow = Math.round(d.inflow * 100) / 100;
    d.outflow = Math.round(d.outflow * 100) / 100;
  }
  return days;
}

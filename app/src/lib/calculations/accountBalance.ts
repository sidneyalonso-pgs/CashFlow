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
        .is("payments.deleted_at", null)
        .lte("paid_at", asOfDate),
      supabase
        .from("revenue_realizations")
        .select("amount, received_at, revenues!inner(receiving_bank_account_id, deleted_at)")
        .eq("revenues.receiving_bank_account_id", accountId)
        .is("revenues.deleted_at", null)
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

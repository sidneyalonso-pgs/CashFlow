import { createClient } from "@/lib/supabase/server";
import { getAccountBalanceAsOf } from "@/lib/calculations/accountBalance";
import type { ReportData } from "./ReportCard";

/** Empresa "Pagsmile IP" — a Central Piloto só existe para ela. */
export async function getPagsmileIpCompany(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .or("trade_name.ilike.%Pagsmile IP%,legal_name.ilike.%Pagsmile IP%")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getReportData(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  date: string
): Promise<ReportData> {
  const [{ data: row }, { data: administrativoAccount }] = await Promise.all([
    supabase
      .from("salva_guarda_diario")
      .select("*, bank_accounts:fee_bank_account_id(nickname, bank_name)")
      .eq("company_id", companyId)
      .eq("data", date)
      .maybeSingle(),
    supabase
      .from("bank_accounts")
      .select("id")
      .eq("company_id", companyId)
      .or("nickname.ilike.%administrativo%,nickname.ilike.%SPB%")
      .limit(1)
      .maybeSingle(),
  ]);

  const saldoAdmin = administrativoAccount ? await getAccountBalanceAsOf(supabase, administrativoAccount.id, companyId, date) : null;

  const saldoEmConta = row?.saldo_em_conta != null ? Number(row.saldo_em_conta) : null;
  const saldo4111 = row?.saldo_4111 != null ? Number(row.saldo_4111) : null;
  const deixarNaCcme = row?.deixar_na_ccme != null ? Number(row.deixar_na_ccme) : null;
  const valorAplicado = saldoEmConta != null ? saldoEmConta - 80000 : null;
  const gap = saldo4111 && valorAplicado != null && deixarNaCcme != null ? (valorAplicado + deixarNaCcme) / saldo4111 : null;

  const bank = (row as any)?.bank_accounts;

  return {
    data: date,
    saldoEmConta,
    fee: row?.fee != null ? Number(row.fee) : null,
    remuneracaoSpi: row?.remuneracao_spi != null ? Number(row.remuneracao_spi) : null,
    remuneracaoCcme: row?.remuneracao_ccme != null ? Number(row.remuneracao_ccme) : null,
    bankLabel: bank?.nickname ?? bank?.bank_name ?? null,
    saldoAdmin,
    valorAplicadoSalvaGuarda: valorAplicado,
    saldo4111,
    gap,
    taxaCcme: row?.taxa_ccme != null ? Number(row.taxa_ccme) : 0.0005166,
    retiradas: row?.retiradas != null ? Number(row.retiradas) : null,
    deixarNaCcme,
  };
}

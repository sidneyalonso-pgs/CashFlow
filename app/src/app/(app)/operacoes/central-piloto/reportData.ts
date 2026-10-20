import { createClient } from "@/lib/supabase/server";
import { COMPONENTES, r2, totalDe, type CompKey } from "@/lib/calculations/centralPiloto";
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

const num = (v: any) => (v != null ? Number(v) : 0);

/**
 * Apuração de receitas de uma DATA DE APURAÇÃO (o dia em que o dinheiro caiu na conta): uma linha por
 * data de referência apurada junto (sexta, sábado e domingo caem juntos na segunda), com os cinco tipos.
 */
export async function getReportData(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  date: string
): Promise<ReportData> {
  const { data: rows } = await supabase
    .from("salva_guarda_diario")
    .select("data, data_apuracao, fee, fee_pix, fee_ted, fee_onboarding, remuneracao_spi, remuneracao_ccme, receipt_bank_account_id, fee_bank_account_id")
    .eq("company_id", companyId)
    .or(`data_apuracao.eq.${date},and(data_apuracao.is.null,data.eq.${date})`)
    .order("data");

  const lista = (rows ?? []) as any[];
  const bancoIds = Array.from(new Set(lista.map((r) => r.receipt_bank_account_id ?? r.fee_bank_account_id).filter(Boolean)));
  const { data: bancos } = bancoIds.length
    ? await supabase.from("bank_accounts").select("id, nickname, bank_name").in("id", bancoIds)
    : { data: [] as any[] };
  const nomeBanco = new Map((bancos ?? []).map((b: any) => [b.id, b.nickname ?? b.bank_name]));

  const linhas = lista.map((r) => {
    const valores = {
      fee_pix: r2(r.fee_pix != null ? num(r.fee_pix) : r.fee_ted == null && r.fee_onboarding == null ? num(r.fee) : 0),
      fee_ted: r2(num(r.fee_ted)),
      fee_onboarding: r2(num(r.fee_onboarding)),
      rem_spi: r2(num(r.remuneracao_spi)),
      rem_ccme: r2(num(r.remuneracao_ccme)),
    } as Record<CompKey, number>;
    return { referencia: r.data as string, valores, total: totalDe(valores) };
  });

  const totais = {} as Record<CompKey, number>;
  for (const c of COMPONENTES) totais[c.key] = r2(linhas.reduce((s, l) => s + l.valores[c.key], 0));

  return {
    apuracao: date,
    linhas,
    totais,
    total: totalDe(totais),
    bankLabel: bancoIds.length ? bancoIds.map((id) => nomeBanco.get(id)).filter(Boolean).join(" / ") : null,
  };
}

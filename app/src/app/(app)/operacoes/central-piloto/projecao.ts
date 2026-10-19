import {
  COMPONENTES,
  diasUteisEntre,
  mediasPorTipo,
  proximoDia,
  totalDe,
  ultimoDiaDoMes,
  type CompKey,
} from "@/lib/calculations/centralPiloto";

type Cliente = any;

export type Apuracao = Record<CompKey, number | null> & { data: string; bankAccountId: string | null };

export type PlanoProjecao = {
  dias: string[];
  medias: Record<CompKey, number>;
  total: number;
  bankAccountId: string | null;
};

/** As 5 últimas apurações (dias com total > 0), da mais recente para a mais antiga. */
export async function ultimasApuracoes(supabase: Cliente, companyId: string, limite = 5): Promise<Apuracao[]> {
  const { data } = await supabase
    .from("salva_guarda_diario")
    .select("data, fee_pix, fee_ted, fee_onboarding, remuneracao_spi, remuneracao_ccme, total_apurado, receipt_bank_account_id, fee_bank_account_id")
    .eq("company_id", companyId)
    .gt("total_apurado", 0)
    .order("data", { ascending: false })
    .limit(limite);
  return ((data ?? []) as any[]).map((r) => ({
    data: r.data,
    fee_pix: r.fee_pix != null ? Number(r.fee_pix) : null,
    fee_ted: r.fee_ted != null ? Number(r.fee_ted) : null,
    fee_onboarding: r.fee_onboarding != null ? Number(r.fee_onboarding) : null,
    rem_spi: r.remuneracao_spi != null ? Number(r.remuneracao_spi) : null,
    rem_ccme: r.remuneracao_ccme != null ? Number(r.remuneracao_ccme) : null,
    bankAccountId: r.receipt_bank_account_id ?? r.fee_bank_account_id ?? null,
  }));
}

/**
 * Projeção do restante do mês de refData: média por tipo das 5 últimas apurações, aplicada a
 * cada dia útil depois da última apuração do mês (ou desde o dia 1, se o mês ainda não tem).
 * Devolve null quando não há o que projetar (sem histórico, valor zero ou mês já passado).
 */
export async function planejarProjecao(
  supabase: Cliente,
  companyId: string,
  refData: string,
  hoje: string
): Promise<PlanoProjecao | null> {
  const inicioMes = refData.slice(0, 8) + "01";
  const fimMes = ultimoDiaDoMes(refData);
  if (fimMes < hoje) return null; // mês já passou: nada a provisionar

  const ultimas = await ultimasApuracoes(supabase, companyId, 5);
  if (ultimas.length === 0) return null;

  const { data: doMes } = await supabase
    .from("salva_guarda_diario")
    .select("data")
    .eq("company_id", companyId)
    .gt("total_apurado", 0)
    .gte("data", inicioMes)
    .lte("data", fimMes)
    .order("data", { ascending: false })
    .limit(1);
  const ultimaDoMes: string | null = doMes?.[0]?.data ?? null;
  const inicio = ultimaDoMes ? proximoDia(ultimaDoMes) : inicioMes;

  const dias = diasUteisEntre(inicio, fimMes);
  const medias = mediasPorTipo(ultimas);
  const total = totalDe(medias);
  if (dias.length === 0 || total <= 0) return null;

  return { dias, medias, total, bankAccountId: ultimas[0].bankAccountId };
}

export const NOMES_CATEGORIAS = [...COMPONENTES.map((c) => c.label)];

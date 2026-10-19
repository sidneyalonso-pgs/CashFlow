import {
  COMPONENTES,
  mediasDaProjecao,
  proximoDia,
  proximoDiaUtil,
  r2,
  totalDe,
  ultimoDiaDoMes,
  valoresDoDia,
  type CompKey,
} from "@/lib/calculations/centralPiloto";

type Cliente = any;

export type Apuracao = Record<CompKey, number | null> & { data: string; bankAccountId: string | null };

export type ProjecaoDia = {
  /** dia a que a receita se refere */
  referencia: string;
  /** dia em que o dinheiro cai na conta: primeiro dia útil seguinte à referência */
  apuracao: string;
  valores: Record<CompKey, number>;
  total: number;
};

export type PlanoProjecao = {
  /** um item por dia de referência ainda não lançado, até o fim do mês */
  dias: ProjecaoDia[];
  /** o mesmo, somado por data de apuração (é o que vira receita estimada no Cash Flow) */
  porApuracao: Array<{ apuracao: string; dias: ProjecaoDia[]; valores: Record<CompKey, number>; total: number }>;
  bankAccountId: string | null;
};

/** Últimas apurações (dias de referência com total > 0), da mais recente para a mais antiga. */
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
 * Projeção do restante do mês de refData, em duas etapas:
 *  1. receita de cada dia de referência (média por tipo das 5 últimas apurações; fees todos os
 *     dias, SPI e CCME só em dia útil), do dia seguinte à última referência lançada até o fim do mês;
 *  2. data em que cada uma cai na conta: o primeiro dia útil seguinte à referência — sexta, sábado
 *     e domingo caem juntas na segunda.
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

  // 12 últimas: dão pelo menos 5 dias úteis mesmo com fins de semana no meio
  const ultimas = await ultimasApuracoes(supabase, companyId, 12);
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

  const medias = mediasDaProjecao(ultimas);
  const dias: ProjecaoDia[] = [];
  for (let d = inicio; d <= fimMes; d = proximoDia(d)) {
    const valores = valoresDoDia(medias, d);
    const total = totalDe(valores);
    if (total > 0) dias.push({ referencia: d, apuracao: proximoDiaUtil(d), valores, total });
  }
  if (dias.length === 0) return null;

  const grupos = new Map<string, ProjecaoDia[]>();
  for (const dia of dias) grupos.set(dia.apuracao, [...(grupos.get(dia.apuracao) ?? []), dia]);
  const porApuracao = Array.from(grupos.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([apuracao, itens]) => {
      const valores = {} as Record<CompKey, number>;
      for (const c of COMPONENTES) valores[c.key] = r2(itens.reduce((s, i) => s + i.valores[c.key], 0));
      return { apuracao, dias: itens, valores, total: totalDe(valores) };
    });

  return { dias, porApuracao, bankAccountId: ultimas[0].bankAccountId };
}

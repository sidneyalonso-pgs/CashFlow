// Central Piloto: receita do dia por tipo, total apurado e projeção do mês.

export const COMPONENTES = [
  { key: "fee_pix", label: "Fee PIX" },
  { key: "fee_ted", label: "Fee TED" },
  { key: "fee_onboarding", label: "Fee Onboarding" },
  { key: "rem_spi", label: "Remuneração SPI" },
  { key: "rem_ccme", label: "Remuneração CCME" },
] as const;

export type CompKey = (typeof COMPONENTES)[number]["key"];
export type Valores = Record<CompKey, number | null>;

/** Categoria da receita única (o detalhe por tipo vive em revenue_components). */
export const CATEGORIA_CABECALHO = "Receita Salva-Guarda";

export const ORIGEM_APURADA = "central_piloto";
export const ORIGEM_PROJECAO = "projecao_central_piloto";

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function totalDe(v: Partial<Record<CompKey, number | null | undefined>>): number {
  return r2(COMPONENTES.reduce((s, c) => s + (Number(v[c.key]) || 0), 0));
}

/** Hoje no horário de Brasília (o servidor roda em UTC). */
export function hojeBR(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function proximoDia(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function ultimoDiaDoMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

export function ehDiaUtil(iso: string): boolean {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay();
  return dow !== 0 && dow !== 6;
}

/** Dias úteis (seg a sex) de from a to, inclusive. */
export function diasUteisEntre(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = proximoDia(d)) if (ehDiaUtil(d)) out.push(d);
  return out;
}

/** Média por tipo das apurações recebidas (as 5 últimas). Vazio = tudo zero. */
export function mediasPorTipo(apuracoes: Array<Partial<Record<CompKey, number | null | undefined>>>): Record<CompKey, number> {
  const out = {} as Record<CompKey, number>;
  for (const c of COMPONENTES) {
    const soma = apuracoes.reduce((s, a) => s + (Number(a[c.key]) || 0), 0);
    out[c.key] = apuracoes.length ? r2(soma / apuracoes.length) : 0;
  }
  return out;
}

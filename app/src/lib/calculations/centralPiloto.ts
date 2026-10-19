// Central Piloto: receita do dia por tipo (cada tipo é uma receita, com a sua categoria), total apurado e projeção do mês.

export const COMPONENTES = [
  { key: "fee_pix", label: "Fee Pix" },
  { key: "fee_ted", label: "Fee TED" },
  { key: "fee_onboarding", label: "Fee Onboarding" },
  { key: "rem_spi", label: "Remuneração Conta PI" },
  { key: "rem_ccme", label: "Remuneração CCME" },
] as const;

export type CompKey = (typeof COMPONENTES)[number]["key"];
export type Valores = Record<CompKey, number | null>;

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

/**
 * Feriados em que não há liquidação bancária (nacionais e de calendário bancário), 2026 e 2027.
 * Sem eles, a projeção cairia o dinheiro em dia que o banco não opera.
 */
export const FERIADOS_BANCARIOS = new Set<string>([
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04",
  "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25",
  "2027-01-01", "2027-02-08", "2027-02-09", "2027-03-26", "2027-04-21", "2027-05-27",
  "2027-09-07", "2027-10-12", "2027-11-02", "2027-11-15",
]);

/** Dia útil = segunda a sexta que não seja feriado bancário. */
export function ehDiaUtil(iso: string): boolean {
  const dow = new Date(iso + "T00:00:00Z").getUTCDay();
  return dow !== 0 && dow !== 6 && !FERIADOS_BANCARIOS.has(iso);
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

/** Primeiro dia útil depois de iso: é quando a receita de iso cai na conta. */
export function proximoDiaUtil(iso: string): string {
  let d = proximoDia(iso);
  while (!ehDiaUtil(d)) d = proximoDia(d);
  return d;
}

/** SPI e CCME só existem em dia útil; os fees (PIX, TED, Onboarding) existem todos os dias. */
export const SO_DIA_UTIL: readonly CompKey[] = ["rem_spi", "rem_ccme"];

/**
 * Médias da projeção, por tipo. `apuracoes` vem da mais recente para a mais antiga.
 * Fees: média das 5 últimas apurações. SPI e CCME: média das 5 últimas apurações com valor.
 */
export function mediasDaProjecao(
  apuracoes: Array<Partial<Record<CompKey, number | null | undefined>> & { data: string }>
): Record<CompKey, number> {
  const ultimas5 = apuracoes.slice(0, 5);
  const out = {} as Record<CompKey, number>;
  for (const c of COMPONENTES) {
    // fees: as 5 últimas apurações. SPI e CCME: as 5 últimas COM valor — os dias sem rendimento
    // (fim de semana, feriado) não entram, senão puxariam a média para baixo
    const base = SO_DIA_UTIL.includes(c.key) ? apuracoes.filter((a) => (Number(a[c.key]) || 0) > 0).slice(0, 5) : ultimas5;
    const soma = base.reduce((s, a) => s + (Number(a[c.key]) || 0), 0);
    out[c.key] = base.length ? r2(soma / base.length) : 0;
  }
  return out;
}

/** Valor esperado de um dia de referência: SPI e CCME zeram em fim de semana. */
export function valoresDoDia(medias: Record<CompKey, number>, referencia: string): Record<CompKey, number> {
  const util = ehDiaUtil(referencia);
  const out = {} as Record<CompKey, number>;
  for (const c of COMPONENTES) out[c.key] = SO_DIA_UTIL.includes(c.key) && !util ? 0 : medias[c.key];
  return out;
}

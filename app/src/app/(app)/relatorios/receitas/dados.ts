// Relatório de receitas do mês (competência): receita por tipo, repasses por empresa e receita líquida.

export const TIPOS_RECEITA = [
  { key: "fee_pix", label: "Fee Pix" },
  { key: "fee_ted", label: "Fee TED" },
  { key: "fee_tef", label: "Fee TEF" },
  { key: "fee_onboarding", label: "Fee Onboarding" },
  { key: "rem_spi", label: "Remuneração SPI" },
  { key: "rem_ccme", label: "Remuneração CCME" },
  { key: "bets", label: "Receita de faturamento (Bets)" },
  { key: "china", label: "Fee China" },
  { key: "mensalidade", label: "Tarifa de mensalidade" },
  { key: "servicos", label: "Prestação de serviços" },
  { key: "outras", label: "Outras receitas" },
] as const;

export type TipoKey = (typeof TIPOS_RECEITA)[number]["key"];

const TIPO_POR_CATEGORIA: Record<string, TipoKey> = {
  "Fee Pix": "fee_pix",
  "Fee TED": "fee_ted",
  "Fee TEF": "fee_tef",
  "Fee Onboarding": "fee_onboarding",
  "Remuneração Conta PI": "rem_spi",
  "Remuneração CCME": "rem_ccme",
  "Prestação de Serviços - Bets Federais": "bets",
  "Tarifa Mensalidade": "mensalidade",
  "Prestação de Serviço": "servicos",
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** O Fee China é lançado na categoria Fee Pix: o que separa é a descrição ("Faturamento — Grupo Pagsmile - CH"). */
export function tipoDaReceita(categoria: string | null, descricao: string | null): TipoKey {
  if (/pagsmile\s*-\s*ch\b|china/i.test(descricao ?? "")) return "china";
  return TIPO_POR_CATEGORIA[categoria ?? ""] ?? "outras";
}

export type LinhaTipo = { key: TipoKey; label: string; real: number; projetado: number; total: number };
export type LinhaRepasse = { empresa: string; pago: number; agendado: number; total: number; status: "Pago" | "Agendado" | "Parcial" };

export type RelatorioReceitas = {
  tipos: LinhaTipo[];
  receitaBruta: { real: number; projetado: number; total: number };
  repasses: LinhaRepasse[];
  totalRepasses: number;
  feePixLiquido: number;
  receitaLiquida: number;
};

/** Receita da Central entra pelo dia de referência (competence_date); as demais, pela data de recebimento ou previsão. */
function dataDaReceita(r: any): string | null {
  if (r.competence_date) return r.competence_date;
  return r.status === "recebida" ? r.realized_date : r.expected_date;
}

export function montaRelatorioReceitas(mes: string, revenues: any[], payments: any[]): RelatorioReceitas {
  const acc = new Map<TipoKey, { real: number; projetado: number }>(TIPOS_RECEITA.map((t) => [t.key, { real: 0, projetado: 0 }]));

  for (const r of revenues) {
    if (r.status !== "recebida" && r.status !== "estimada") continue;
    const d = dataDaReceita(r);
    if (!d || d.slice(0, 7) !== mes) continue;
    const valor = Number(r.status === "recebida" ? r.realized_amount : r.expected_amount) || 0;
    const a = acc.get(tipoDaReceita(r.categories?.name ?? null, r.description ?? null))!;
    if (r.status === "recebida") a.real += valor;
    else a.projetado += valor;
  }

  const tipos: LinhaTipo[] = TIPOS_RECEITA.map((t) => {
    const a = acc.get(t.key)!;
    return { key: t.key, label: t.label, real: r2(a.real), projetado: r2(a.projetado), total: r2(a.real + a.projetado) };
  });
  const receitaBruta = {
    real: r2(tipos.reduce((s, t) => s + t.real, 0)),
    projetado: r2(tipos.reduce((s, t) => s + t.projetado, 0)),
    total: r2(tipos.reduce((s, t) => s + t.total, 0)),
  };

  const porEmpresa = new Map<string, { pago: number; agendado: number }>();
  for (const p of payments) {
    if (p.status !== "pago" && p.status !== "agendado") continue;
    if (!/^\s*repasse/i.test(p.description ?? "")) continue;
    if (!p.competence_date || String(p.competence_date).slice(0, 7) !== mes) continue;
    const empresa = p.suppliers?.legal_name ?? "Sem fornecedor";
    const a = porEmpresa.get(empresa) ?? { pago: 0, agendado: 0 };
    const valor = Number(p.gross_amount) || 0;
    if (p.status === "pago") a.pago += valor;
    else a.agendado += valor;
    porEmpresa.set(empresa, a);
  }
  const repasses: LinhaRepasse[] = Array.from(porEmpresa.entries())
    .map(([empresa, a]) => ({
      empresa,
      pago: r2(a.pago),
      agendado: r2(a.agendado),
      total: r2(a.pago + a.agendado),
      status: (a.agendado === 0 ? "Pago" : a.pago === 0 ? "Agendado" : "Parcial") as LinhaRepasse["status"],
    }))
    .sort((a, b) => b.total - a.total);
  const totalRepasses = r2(repasses.reduce((s, x) => s + x.total, 0));

  const feePix = tipos.find((t) => t.key === "fee_pix")!.total;
  return {
    tipos,
    receitaBruta,
    repasses,
    totalRepasses,
    feePixLiquido: r2(feePix - totalRepasses),
    receitaLiquida: r2(receitaBruta.total - totalRepasses),
  };
}

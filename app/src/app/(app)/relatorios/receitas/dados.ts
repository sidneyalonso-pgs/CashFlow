// Relatório de receitas do mês (competência) da Pagsmile IP: receita por tipo, repasses por empresa e receita líquida.
// Serve para o fechamento: cada tipo traz os lançamentos que o compõem.

/** Linhas fixas do relatório, na ordem de exibição. Qualquer outra categoria com valor ganha a sua própria linha depois delas. */
const TIPOS_FIXOS = [
  "Fee Pix",
  "Fee TED",
  "Fee TEF",
  "Fee Onboarding",
  "Remuneração SPI",
  "Remuneração CCME",
  "Receita de faturamento (Bets)",
  "Fee China",
  "Tarifa de mensalidade",
  "Prestação de serviços",
] as const;

const TIPO_POR_CATEGORIA: Record<string, string> = {
  "Fee Pix": "Fee Pix",
  "Fee TED": "Fee TED",
  "Fee TEF": "Fee TEF",
  "Fee Onboarding": "Fee Onboarding",
  "Remuneração Conta PI": "Remuneração SPI",
  "Remuneração CCME": "Remuneração CCME",
  "Prestação de Serviços - Bets Federais": "Receita de faturamento (Bets)",
  "Tarifa Mensalidade": "Tarifa de mensalidade",
  "Prestação de Serviço": "Prestação de serviços",
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** O Fee China é lançado na categoria Fee Pix: o que separa é a descrição ("Faturamento — Grupo Pagsmile - CH"). */
export function tipoDaReceita(categoria: string | null, descricao: string | null): string {
  if (/pagsmile\s*-\s*ch\b|china/i.test(descricao ?? "")) return "Fee China";
  return TIPO_POR_CATEGORIA[categoria ?? ""] ?? categoria ?? "Sem categoria";
}

export type ItemReceita = {
  descricao: string;
  status: "recebida" | "estimada";
  /** competência usada no relatório: "AAAA-MM" (da fatura) ou o dia de referência "AAAA-MM-DD" */
  competencia: string;
  /** dia do caixa: recebimento (recebida) ou previsão (estimada) */
  caixa: string | null;
  valor: number;
};
export type LinhaTipo = { label: string; real: number; projetado: number; total: number; itens: ItemReceita[] };
export type LinhaRepasse = { empresa: string; pago: number; agendado: number; total: number; status: "Pago" | "Agendado" | "Parcial" };

export type RelatorioReceitas = {
  tipos: LinhaTipo[];
  receitaBruta: { real: number; projetado: number; total: number };
  repasses: LinhaRepasse[];
  totalRepasses: number;
  feePixLiquido: number;
  receitaLiquida: number;
};

/**
 * Competência da receita: a da FATURA quando a receita vem de uma fatura (Bets, mensalidade, China: "AAAA-MM"),
 * o dia de referência nas da Central (competence_date); as demais, a data de recebimento ou previsão.
 */
function dataDaReceita(r: any, competenciaFatura: Map<string, string>): string | null {
  const daFatura = r.id ? competenciaFatura.get(r.id) : null;
  if (daFatura) return daFatura;
  if (r.competence_date) return r.competence_date;
  return r.status === "recebida" ? r.realized_date : r.expected_date;
}

export function montaRelatorioReceitas(
  mes: string,
  revenues: any[],
  payments: any[],
  competenciaFatura: Map<string, string> = new Map()
): RelatorioReceitas {
  const acc = new Map<string, { real: number; projetado: number; itens: ItemReceita[] }>(
    TIPOS_FIXOS.map((t) => [t, { real: 0, projetado: 0, itens: [] }])
  );

  for (const r of revenues) {
    if (r.status !== "recebida" && r.status !== "estimada") continue;
    const d = dataDaReceita(r, competenciaFatura);
    if (!d || d.slice(0, 7) !== mes) continue;
    const valor = Number(r.status === "recebida" ? r.realized_amount : r.expected_amount) || 0;
    const tipo = tipoDaReceita(r.categories?.name ?? null, r.description ?? null);
    const a = acc.get(tipo) ?? { real: 0, projetado: 0, itens: [] };
    if (r.status === "recebida") a.real += valor;
    else a.projetado += valor;
    a.itens.push({
      descricao: String(r.description ?? "").trim() || "(sem descrição)",
      status: r.status,
      competencia: d,
      caixa: (r.status === "recebida" ? r.realized_date : r.expected_date) ?? null,
      valor: r2(valor),
    });
    acc.set(tipo, a);
  }

  const montaLinha = (label: string): LinhaTipo => {
    const a = acc.get(label)!;
    return {
      label,
      real: r2(a.real),
      projetado: r2(a.projetado),
      total: r2(a.real + a.projetado),
      itens: a.itens.sort((x, y) => y.valor - x.valor),
    };
  };
  const fixas = TIPOS_FIXOS.map((t) => montaLinha(t));
  const extras = Array.from(acc.keys())
    .filter((k) => !(TIPOS_FIXOS as readonly string[]).includes(k))
    .map(montaLinha)
    .filter((l) => l.total !== 0)
    .sort((a, b) => b.total - a.total);
  const tipos = [...fixas, ...extras];

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

  const feePix = tipos.find((t) => t.label === "Fee Pix")?.total ?? 0;
  return {
    tipos,
    receitaBruta,
    repasses,
    totalRepasses,
    feePixLiquido: r2(feePix - totalRepasses),
    receitaLiquida: r2(receitaBruta.total - totalRepasses),
  };
}

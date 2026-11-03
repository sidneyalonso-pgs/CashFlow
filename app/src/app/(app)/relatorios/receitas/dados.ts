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
  "Prestação de Serviços Bets Federais",
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
  "Prestação de Serviços - Bets Federais": "Prestação de Serviços Bets Federais",
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
  /** dia em que o lançamento foi criado no sistema */
  lancadoEm: string | null;
  valor: number;
};
export type LinhaTipo = { label: string; real: number; projetado: number; total: number; itens: ItemReceita[] };
/** Um repasse (pagamento "Repasse…"): período da fatura, data em que saiu (ou está prevista) e status. */
export type LinhaRepasse = {
  empresa: string;
  valor: number;
  periodo: string | null;
  data: string | null;
  status: "Pago" | "Agendado";
};

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
  competenciaFatura: Map<string, string> = new Map(),
  periodoPorPagamento: Map<string, string> = new Map(),
  competenciaPorPagamento: Map<string, string> = new Map()
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
      lancadoEm: r.created_at ? String(r.created_at).slice(0, 10) : null,
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
      // em ordem de dia: competência, depois caixa, depois maior valor
      itens: a.itens.sort(
        (x, y) =>
          (x.competencia.length === 7 ? `${x.competencia}-01` : x.competencia).localeCompare(y.competencia.length === 7 ? `${y.competencia}-01` : y.competencia) ||
          (x.caixa ?? "").localeCompare(y.caixa ?? "") ||
          y.valor - x.valor
      ),
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

  const repasses: LinhaRepasse[] = [];
  for (const p of payments) {
    if (p.status !== "pago" && p.status !== "agendado") continue;
    if (!/^\s*repasse/i.test(p.description ?? "")) continue;
    // repasse de fatura entra na competência da FATURA (o vencimento pode cair no mês seguinte); os demais, na do pagamento
    const compRepasse = (p.id ? competenciaPorPagamento.get(p.id) : null) ?? (p.competence_date ? String(p.competence_date).slice(0, 7) : null);
    if (compRepasse !== mes) continue;
    const fatura = p.id ? periodoPorPagamento.get(p.id) : null;
    repasses.push({
      empresa: p.suppliers?.legal_name ?? "Sem fornecedor",
      valor: r2(Number(p.gross_amount) || 0),
      periodo: fatura ?? null,
      // pago: dia em que saiu; agendado: dia previsto
      data: (p.status === "pago" ? p.effective_payment_date : null) ?? p.expected_payment_date ?? p.due_date ?? null,
      status: p.status === "pago" ? "Pago" : "Agendado",
    });
  }
  repasses.sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "") || a.empresa.localeCompare(b.empresa));
  const totalRepasses = r2(repasses.reduce((s, x) => s + x.valor, 0));

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

export type CelulaGrade = { real: number; proj: number };
export type GradeReceitas = {
  /** tipos de receita com lançamento no mês (uma coluna cada) */
  colunas: string[];
  /** todos os dias do mês (AAAA-MM-DD) */
  dias: string[];
  /** dia -> coluna -> realizado e projetado */
  celulas: Record<string, Record<string, CelulaGrade>>;
};

/**
 * Grade da provisão: um dia de competência por linha e um tipo de receita por coluna, com o realizado (recebida)
 * e o projetado (estimada) lado a lado. Receita faturada (competência só com mês e ano) cai no último dia do mês.
 */
export function montaGrade(mes: string, rel: RelatorioReceitas): GradeReceitas {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const dias = Array.from({ length: ultimo }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
  const colunas = rel.tipos.filter((t) => t.itens.length > 0).map((t) => t.label);
  const celulas: Record<string, Record<string, CelulaGrade>> = {};
  for (const t of rel.tipos) {
    for (const i of t.itens) {
      const dia = i.competencia.length === 7 ? dias[dias.length - 1] : i.competencia;
      const c = ((celulas[dia] ??= {})[t.label] ??= { real: 0, proj: 0 });
      if (i.status === "recebida") c.real = r2(c.real + i.valor);
      else c.proj = r2(c.proj + i.valor);
    }
  }
  return { colunas, dias, celulas };
}

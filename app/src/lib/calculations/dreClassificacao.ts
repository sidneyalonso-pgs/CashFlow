// Classificação DRE do fornecedor: a "segunda categoria" do cadastro, que diz em qual linha da DRE
// gerencial as despesas do fornecedor entram. É independente da categoria do pagamento (que serve
// para o FP&A e para o fluxo de caixa).

export type GrupoDre = "custos" | "pessoal" | "operacionais" | "financeiras" | "nenhum";

export const LINHAS_DRE: ReadonlyArray<{ nome: string; grupo: GrupoDre }> = [
  // Custos dos serviços prestados
  { nome: "Tarifas bancárias e BACEN", grupo: "custos" },
  { nome: "Outros custos operacionais", grupo: "custos" },
  // Despesas com pessoal
  { nome: "Salários e encargos", grupo: "pessoal" },
  { nome: "PJ", grupo: "pessoal" },
  { nome: "Benefícios", grupo: "pessoal" },
  { nome: "Pró-labore", grupo: "pessoal" },
  { nome: "(-) Custo compartilhado (rateio intragrupo)", grupo: "pessoal" },
  // Despesas operacionais
  { nome: "Tecnologia e licenças de software", grupo: "operacionais" },
  { nome: "Serviços profissionais (auditoria, contábil, consultoria)", grupo: "operacionais" },
  { nome: "Jurídico, contingências e perdas", grupo: "operacionais" },
  { nome: "Ocupação e utilidades", grupo: "operacionais" },
  { nome: "Marketing e relações públicas", grupo: "operacionais" },
  { nome: "Despesas tributárias", grupo: "operacionais" },
  { nome: "Despesas administrativas gerais", grupo: "operacionais" },
  { nome: "Recuperação de despesas (reembolsos/rateios)", grupo: "operacionais" },
  // Despesas financeiras
  { nome: "IOF e tarifas bancárias", grupo: "financeiras" },
  { nome: "PIS/COFINS sobre receitas financeiras", grupo: "financeiras" },
  { nome: "Juros, multas e perdas com títulos", grupo: "financeiras" },
  { nome: "Juros de arrendamento (IFRS 16)", grupo: "financeiras" },
  // Fora da DRE
  { nome: "Não classificável (receita / aporte / mov. financeira)", grupo: "nenhum" },
];

export const GRUPO_POR_LINHA: Record<string, GrupoDre> = Object.fromEntries(LINHAS_DRE.map((l) => [l.nome, l.grupo]));

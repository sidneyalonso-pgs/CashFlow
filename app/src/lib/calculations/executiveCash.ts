import Decimal from "decimal.js";
import { sumMoney } from "./money";
import { scopeAccounts, transferDirection } from "./transfers";

/**
 * Capacidade financeira por empresa e consolidada, para a Posição Executiva de Recursos.
 *
 * Caixa é saldo em conta bancária e nunca inclui investimento — o valor aplicado aparece à
 * parte, e só a Disponibilidade Total soma os dois. As regras de caixa são as mesmas já
 * conferidas contra extrato no Cash Flow: direção de transferência pela conta, aplicação de
 * investimento debita a conta corrente e resgate credita, e o ponto de partida é o saldo
 * cadastrado mais tudo o que foi realizado até a data.
 *
 * Consolidado não é a soma ingênua das empresas: o escopo passa a ser todas as contas juntas,
 * então transferência entre contas do grupo cai como entrada e saída no mesmo escopo e se
 * anula, sem precisar de regra de intercompany.
 */

export type Account = {
  id: string;
  company_id: string;
  initial_balance: number | string | null;
  counts_as_available_cash: boolean;
};

export type Dated = { amount: number | string | null; date: string; companyId: string };
export type Investment = {
  companyId: string;
  tipo: string;
  applied_amount: number | string | null;
  applied_date: string;
  is_opening_balance: boolean;
};
export type Transfer = {
  tipo: string;
  amount: number | string | null;
  transfer_date: string;
  company_id: string | null;
  to_company_id?: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
};

export type CapacityInput = {
  accounts: Account[];
  /** realizados: definem o caixa de hoje */
  inflows: Dated[];
  outflows: Dated[];
  investments: Investment[];
  transfers: Transfer[];
  /** provisionados: pagamentos a vencer e recebimentos a receber */
  compromissos: Dated[];
  recebiveis: Dated[];
  today: string;
  /** fim do horizonte de compromissos, inclusive */
  horizonEnd: string;
  /** reserva por empresa; ausente = não definida (não é zero) */
  reserves: Record<string, number | null | undefined>;
};

/** Decimal lança exceção com null; o banco aceita lançamento sem valor. */
function num(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type Capacity = {
  caixa: Decimal;
  investido: Decimal;
  disponibilidade: Decimal;
  compromissos: Decimal;
  recebiveis: Decimal;
  /** null = não definida no cadastro */
  reserva: number | null;
  capacidade: Decimal;
  /** caixa livre hoje, já descontados compromissos e reserva — usado para "cabe em caixa" */
  caixaLivre: Decimal;
  /** saldo de caixa nos últimos 7 dias, para a tendência compacta */
  serie7d: number[];
};

type Mov = { amount: number; date: string };

function movimentos(input: CapacityInput, companyIds: Set<string>) {
  const cashAccounts = input.accounts.filter(
    (a) => companyIds.has(a.company_id) && a.counts_as_available_cash
  );
  const scopeIds = scopeAccounts(undefined, cashAccounts);
  const { isInflow, isOutflow } = transferDirection(scopeIds, companyIds);
  const mine = <T extends { companyId: string }>(rows: T[]) => rows.filter((r) => companyIds.has(r.companyId));

  const transfers = input.transfers.filter(
    (t) =>
      (t.from_account_id && scopeIds.has(t.from_account_id)) ||
      (t.to_account_id && scopeIds.has(t.to_account_id)) ||
      (t.company_id && companyIds.has(t.company_id))
  );
  const invs = mine(input.investments);

  const entradas: Mov[] = [
    ...mine(input.inflows).map((r) => ({ amount: num(r.amount), date: r.date })),
    ...invs.filter((i) => i.tipo === "resgate").map((i) => ({ amount: num(i.applied_amount), date: i.applied_date })),
    ...transfers.filter(isInflow).map((t) => ({ amount: num(t.amount), date: t.transfer_date })),
  ];
  const saidas: Mov[] = [
    ...mine(input.outflows).map((p) => ({ amount: num(p.amount), date: p.date })),
    ...invs
      .filter((i) => i.tipo === "aplicacao" && !i.is_opening_balance)
      .map((i) => ({ amount: num(i.applied_amount), date: i.applied_date })),
    ...transfers.filter(isOutflow).map((t) => ({ amount: num(t.amount), date: t.transfer_date })),
  ];

  const cadastrado = sumMoney(cashAccounts.map((a) => num(a.initial_balance)));
  const caixaEm = (limite: string) =>
    cadastrado
      .plus(sumMoney(entradas.filter((m) => m.date <= limite).map((m) => m.amount)))
      .minus(sumMoney(saidas.filter((m) => m.date <= limite).map((m) => m.amount)));

  const investido = invs
    .filter((i) => i.applied_date <= input.today)
    .reduce((acc, i) => (i.tipo === "aplicacao" ? acc.plus(num(i.applied_amount)) : acc.minus(num(i.applied_amount))), new Decimal(0));

  return { caixaEm, investido, mine };
}

function slice(input: CapacityInput, companyIds: Set<string>, reserva: number | null): Capacity {
  const { caixaEm, investido, mine } = movimentos(input, companyIds);

  const caixa = caixaEm(input.today);
  const disponibilidade = caixa.plus(investido);

  const naJanela = (rows: Dated[]) =>
    sumMoney(
      mine(rows)
        .filter((r) => r.date >= input.today && r.date <= input.horizonEnd)
        .map((r) => num(r.amount))
    );
  const compromissos = naJanela(input.compromissos);
  const recebiveis = naJanela(input.recebiveis);

  const capacidade = disponibilidade.minus(compromissos).minus(reserva ?? 0);
  const caixaLivre = caixa.minus(compromissos).minus(reserva ?? 0);

  const serie7d: number[] = [];
  for (let i = 6; i >= 0; i--) serie7d.push(caixaEm(shift(input.today, -i)).toNumber());

  return { caixa, investido, disponibilidade, compromissos, recebiveis, reserva, capacidade, caixaLivre, serie7d };
}

function shift(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type CompanyCapacity = Capacity & { companyId: string; label: string };

export function buildCapacity(
  input: CapacityInput,
  companies: Array<{ id: string; label: string }>
) {
  const porEmpresa: CompanyCapacity[] = companies.map((c) => ({
    companyId: c.id,
    label: c.label,
    ...slice(input, new Set([c.id]), input.reserves[c.id] ?? null),
  }));

  const todos = new Set(companies.map((c) => c.id));
  // Reserva do grupo é a soma das definidas; se nenhuma foi definida, continua indefinida.
  const definidas = companies.map((c) => input.reserves[c.id]).filter((r): r is number => typeof r === "number");
  const reservaGrupo = definidas.length ? definidas.reduce((a, b) => a + b, 0) : null;
  const consolidado = slice(input, todos, reservaGrupo);

  // Transferência entre duas contas do próprio grupo: se anula no consolidado. Só é
  // identificável quando as duas pontas têm conta cadastrada — quando a perna de entrada foi
  // lançada como receita na outra empresa não há campo que ligue as duas, e o par não é
  // reconhecível. O saldo consolidado continua certo; o que não dá é afirmar o volume total.
  const cashIds = scopeAccounts(
    undefined,
    input.accounts.filter((a) => todos.has(a.company_id) && a.counts_as_available_cash)
  );
  const intercompanyIdentificavel = input.transfers.filter(
    (t) => t.from_account_id && t.to_account_id && cashIds.has(t.from_account_id) && cashIds.has(t.to_account_id)
  ).length;

  const somaEmpresas = porEmpresa.reduce((acc, e) => acc.plus(e.caixa), new Decimal(0));
  const diferencaReconciliacao = somaEmpresas.minus(consolidado.caixa);

  return { porEmpresa, consolidado, intercompanyIdentificavel, diferencaReconciliacao };
}

// ── simulação de decisão ──────────────────────────────────────────────────────
// Regra objetiva, sem estimativa: os compromissos considerados são os que vencem entre hoje e
// a data da decisão, e a folga é disponibilidade menos compromissos, reserva e desembolso.

export type Veredito = "cabe_em_caixa" | "cabe_com_resgate" | "requer_intercompany" | "nao_comporta";

export type SimulacaoEntrada = {
  caixa: number;
  investido: number;
  reserva: number | null;
  /** compromissos que vencem entre hoje e a data da decisão */
  compromissos: number;
  recebiveis: number;
  desembolso: number;
  /** mesmos números no nível do grupo, para o caso de exigir movimentação entre empresas */
  grupo: { caixa: number; investido: number; reserva: number | null; compromissos: number };
};

export type Simulacao = {
  veredito: Veredito;
  disponibilidade: number;
  compromissos: number;
  reserva: number;
  desembolso: number;
  folga: number;
  /** quanto teria de sair de investimento por falta de caixa */
  resgateNecessario: number;
};

export function simularDecisao(e: SimulacaoEntrada): Simulacao {
  const reserva = e.reserva ?? 0;
  const disponibilidade = e.caixa + e.investido;
  const folga = disponibilidade - e.compromissos - reserva - e.desembolso;
  const caixaLivre = e.caixa - e.compromissos - reserva;
  const resgateNecessario = Math.max(0, e.desembolso - Math.max(caixaLivre, 0));

  let veredito: Veredito;
  if (folga >= 0) {
    veredito = caixaLivre >= e.desembolso ? "cabe_em_caixa" : "cabe_com_resgate";
  } else {
    const reservaGrupo = e.grupo.reserva ?? 0;
    const folgaGrupo = e.grupo.caixa + e.grupo.investido - e.grupo.compromissos - reservaGrupo - e.desembolso;
    veredito = folgaGrupo >= 0 ? "requer_intercompany" : "nao_comporta";
  }

  return {
    veredito,
    disponibilidade,
    compromissos: e.compromissos,
    reserva,
    desembolso: e.desembolso,
    folga,
    resgateNecessario,
  };
}

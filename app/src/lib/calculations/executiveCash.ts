import Decimal from "decimal.js";
import { sumMoney } from "./money";
import { scopeAccounts, transferDirection } from "./transfers";

/**
 * Agregação de caixa por empresa e consolidada, para a Posição Executiva de Caixa.
 *
 * Reaproveita as mesmas regras já validadas contra extrato no Cash Flow: a direção das
 * transferências vem da conta (transferDirection), aplicação de investimento debita a conta
 * corrente e resgate credita, e o saldo de abertura é o saldo cadastrado mais tudo o que foi
 * realizado antes do período.
 *
 * Consolidado não é a soma ingênua das empresas: o escopo passa a ser o conjunto de todas as
 * contas selecionadas, então uma transferência entre duas contas do grupo cai como entrada e
 * saída no mesmo escopo e se anula sozinha, sem regra especial de intercompany.
 */

export type Account = {
  id: string;
  company_id: string;
  initial_balance: number | string;
  counts_as_available_cash: boolean;
  blocked_balance?: number | string | null;
};

export type Realization = { amount: number | string; date: string; companyId: string };
export type Provision = { amount: number | string; date: string; companyId: string };
export type Investment = {
  companyId: string;
  tipo: string;
  applied_amount: number | string;
  applied_date: string;
  is_opening_balance: boolean;
};
export type Transfer = {
  tipo: string;
  amount: number | string;
  transfer_date: string;
  company_id: string | null;
  to_company_id?: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
};

export type CashInput = {
  accounts: Account[];
  inflows: Realization[];
  outflows: Realization[];
  aReceber: Provision[];
  aPagar: Provision[];
  investments: Investment[];
  transfers: Transfer[];
  from: string;
  to: string;
  today: string;
};

export type CashSlice = {
  caixaInicial: Decimal;
  entradas: Decimal;
  saidas: Decimal;
  fluxoLiquido: Decimal;
  caixaFinal: Decimal;
  caixaHoje: Decimal;
  aReceber: Decimal;
  aPagar: Decimal;
  investido: Decimal;
  bloqueado: Decimal;
  variacao: Decimal;
  /** null quando o caixa inicial é zero ou negativo: o percentual não teria significado */
  variacaoPerc: number | null;
  /** data do último lançamento realizado, para sinalizar posição desatualizada */
  ultimoLancamento: string | null;
};

const zero = () => new Decimal(0);

/**
 * Valor sempre numérico. Decimal lança exceção com null/undefined, e o banco aceita valor nulo
 * em lançamento (pagamento cadastrado sem valor, por exemplo) — sem isso a tela inteira quebra
 * por causa de uma linha incompleta.
 */
function num(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

/** Uma fatia = um escopo (uma empresa, ou o grupo todo). companyIds define quem entra. */
function slice(input: CashInput, companyIds: Set<string>): CashSlice {
  const cashAccounts = input.accounts.filter(
    (a) => companyIds.has(a.company_id) && a.counts_as_available_cash
  );
  const scopeIds = scopeAccounts(undefined, cashAccounts);
  const { isInflow, isOutflow } = transferDirection(scopeIds, companyIds);

  const mine = <T extends { companyId: string }>(rows: T[]) => rows.filter((r) => companyIds.has(r.companyId));

  const revIn = mine(input.inflows);
  const payOut = mine(input.outflows);
  const invs = mine(input.investments);
  const transfers = input.transfers.filter(
    (t) =>
      (t.from_account_id && scopeIds.has(t.from_account_id)) ||
      (t.to_account_id && scopeIds.has(t.to_account_id)) ||
      (t.company_id && companyIds.has(t.company_id))
  );

  // movimentos de caixa realizados, com a data em que afetaram a conta
  const cashIn: Array<{ amount: number; date: string }> = [
    ...revIn.map((r) => ({ amount: num(r.amount), date: r.date })),
    ...invs
      .filter((i) => i.tipo === "resgate")
      .map((i) => ({ amount: num(i.applied_amount), date: i.applied_date })),
    ...transfers.filter(isInflow).map((t) => ({ amount: num(t.amount), date: t.transfer_date })),
  ];
  const cashOut: Array<{ amount: number; date: string }> = [
    ...payOut.map((p) => ({ amount: num(p.amount), date: p.date })),
    ...invs
      .filter((i) => i.tipo === "aplicacao" && !i.is_opening_balance)
      .map((i) => ({ amount: num(i.applied_amount), date: i.applied_date })),
    ...transfers.filter(isOutflow).map((t) => ({ amount: num(t.amount), date: t.transfer_date })),
  ];

  const somaAte = (rows: Array<{ amount: number; date: string }>, limite: string) =>
    sumMoney(rows.filter((r) => r.date <= limite).map((r) => r.amount));
  const somaNo = (rows: Array<{ amount: number; date: string }>, from: string, to: string) =>
    sumMoney(rows.filter((r) => inRange(r.date, from, to)).map((r) => r.amount));

  const cadastrado = sumMoney(cashAccounts.map((a) => num(a.initial_balance)));
  const antes = (limite: string) => cadastrado.plus(somaAte(cashIn, limite)).minus(somaAte(cashOut, limite));

  const caixaInicial = antes(previousDay(input.from));
  const entradas = somaNo(cashIn, input.from, input.to);
  const saidas = somaNo(cashOut, input.from, input.to);
  const caixaFinal = caixaInicial.plus(entradas).minus(saidas);
  const caixaHoje = antes(input.today);

  const investido = invs
    .filter((i) => i.applied_date <= input.to)
    .reduce(
      (acc, i) => (i.tipo === "aplicacao" ? acc.plus(num(i.applied_amount)) : acc.minus(num(i.applied_amount))),
      zero()
    );

  const variacao = caixaFinal.minus(caixaInicial);
  const variacaoPerc = caixaInicial.greaterThan(0)
    ? caixaFinal.dividedBy(caixaInicial).minus(1).times(100).toNumber()
    : null;

  const datas = [...cashIn, ...cashOut].map((r) => r.date).sort();

  return {
    caixaInicial,
    entradas,
    saidas,
    fluxoLiquido: entradas.minus(saidas),
    caixaFinal,
    caixaHoje,
    aReceber: sumMoney(mine(input.aReceber).filter((p) => inRange(p.date, input.from, input.to)).map((p) => num(p.amount))),
    aPagar: sumMoney(mine(input.aPagar).filter((p) => inRange(p.date, input.from, input.to)).map((p) => num(p.amount))),
    investido,
    bloqueado: sumMoney(cashAccounts.map((a) => num(a.blocked_balance))),
    variacao,
    variacaoPerc,
    ultimoLancamento: datas.length ? datas[datas.length - 1] : null,
  };
}

function previousDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type CompanyCash = CashSlice & { companyId: string; label: string };

export function buildExecutiveCash(
  input: CashInput,
  companies: Array<{ id: string; label: string }>
) {
  const porEmpresa: CompanyCash[] = companies.map((c) => ({
    companyId: c.id,
    label: c.label,
    ...slice(input, new Set([c.id])),
  }));

  const todos = new Set(companies.map((c) => c.id));
  const consolidado = slice(input, todos);

  // Volume que se anulou na consolidação: transferência entre duas contas do próprio grupo.
  // Só é identificável quando as duas pontas têm conta cadastrada — quando a perna de entrada
  // foi lançada como receita na outra empresa, não há campo que ligue as duas e o par não é
  // reconhecível. Nesses casos o saldo consolidado continua certo (as pernas se compensam),
  // mas entradas e saídas ficam infladas pelo mesmo valor.
  const cashIds = scopeAccounts(
    undefined,
    input.accounts.filter((a) => todos.has(a.company_id) && a.counts_as_available_cash)
  );
  const intercompanyEliminado = sumMoney(
    input.transfers
      .filter(
        (t) =>
          t.from_account_id &&
          t.to_account_id &&
          cashIds.has(t.from_account_id) &&
          cashIds.has(t.to_account_id) &&
          inRange(t.transfer_date, input.from, input.to)
      )
      .map((t) => num(t.amount))
  );

  // A soma das empresas tem de reconciliar com o consolidado. Se divergir, é porque existe
  // movimento fora de qualquer escopo de empresa — melhor mostrar a diferença do que esconder.
  const somaEmpresas = porEmpresa.reduce((acc, e) => acc.plus(e.caixaFinal), zero());
  const diferencaReconciliacao = somaEmpresas.minus(consolidado.caixaFinal);

  return { porEmpresa, consolidado, intercompanyEliminado, diferencaReconciliacao };
}

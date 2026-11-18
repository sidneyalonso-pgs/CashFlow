import { stringSimilarity, type Candidate } from "./score";

export type MatchEntry = {
  id: string;
  date: string; // ISO
  amount: number; // sempre positivo
  direction: "entrada" | "saida";
  description: string;
};

export type Confidence =
  /** conta, valor e data batem e não há ambiguidade: pode ser aprovada em lote */
  | "alta"
  /** valor e data batem, mas há mais de um candidato (ou o lançamento não tem conta): confirmar uma a uma */
  | "revisar"
  /** valor e data batem, mas o lançamento foi baixado em OUTRA conta do Treasury */
  | "conta_divergente";

export type Proposal = {
  /** "1:1" uma linha ↔ um lançamento; "N:1" várias linhas do banco ↔ um lançamento; "1:N" uma linha ↔ vários lançamentos */
  kind: "1:1" | "N:1" | "1:N";
  entryIds: string[];
  candidates: Candidate[];
  confidence: Confidence;
  reason: string;
  /** maior diferença de data (dias) entre as pontas */
  daysDiff: number;
};

/** tolerância de data (dias) entre a linha do banco e a baixa no Treasury */
const MAX_DAYS = 3;
/** até quantos dias a diferença ainda conta como "alta confiança" */
const HIGH_DAYS = 1;
/** limites da busca de combinações (soma exata) */
const GROUP_POOL_MAX = 40;
const GROUP_SIZE_MAX_ENTRIES = 15;
const GROUP_SIZE_MAX_CANDIDATES = 8;
const SEARCH_NODE_BUDGET = 300_000;

const cents = (n: number) => Math.round(n * 100);

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

type Scored = {
  entry: MatchEntry;
  candidate: Candidate;
  days: number;
  sim: number;
  sameAccount: boolean; // true = a conta do lançamento é a do extrato
  noAccount: boolean; // lançamento sem conta informada
};

/**
 * Busca subconjuntos (de 2 a `maxSize` itens) cuja soma, em centavos, é exatamente `target`.
 * Devolve até 2 soluções — saber se existe MAIS DE UMA é o que decide entre "alta" e "revisar".
 * O orçamento de nós limita o custo no pior caso.
 */
function findSubsets(items: { id: string; cents: number }[], target: number, maxSize: number): string[][] {
  const sorted = [...items].filter((i) => i.cents > 0 && i.cents < target).sort((a, b) => b.cents - a.cents);
  const suffix: number[] = new Array(sorted.length + 1).fill(0);
  for (let i = sorted.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + sorted[i].cents;

  const solutions: string[][] = [];
  let nodes = 0;
  const chosen: string[] = [];

  const dfs = (start: number, remaining: number) => {
    if (solutions.length >= 2 || nodes++ > SEARCH_NODE_BUDGET) return;
    if (remaining === 0) {
      if (chosen.length >= 2) solutions.push([...chosen]);
      return;
    }
    if (chosen.length >= maxSize || start >= sorted.length || suffix[start] < remaining) return;
    for (let i = start; i < sorted.length; i++) {
      if (sorted[i].cents > remaining) continue;
      chosen.push(sorted[i].id);
      dfs(i + 1, remaining - sorted[i].cents);
      chosen.pop();
      if (solutions.length >= 2 || nodes > SEARCH_NODE_BUDGET) return;
    }
  };
  dfs(0, target);
  return solutions;
}

/**
 * Propõe pares entre as linhas pendentes do extrato e os lançamentos do Treasury.
 *
 * Todas as regras exigem valor igual ao centavo e data a no máximo 3 dias:
 *  1) 1:1, alta: lançamento na MESMA conta do extrato, até 1 dia de diferença e sem ambiguidade;
 *  2) 1:1, revisar: mesma conta (ou sem conta) mas ambíguo / mais distante;
 *  3) 1:1, conta divergente: o valor bate com um lançamento baixado em OUTRA conta (baixa na conta errada);
 *  4) N:1: o banco quebrou um lançamento em várias linhas (ex.: folha paga em vários PIX) — a soma das
 *     linhas fecha com o lançamento;
 *  5) 1:N: uma linha do banco paga vários lançamentos de uma vez (ex.: débito único de consórcios).
 *
 * Linhas e lançamentos são usados em no máximo uma proposta. Nada é gravado aqui.
 */
export function buildProposals(
  entries: MatchEntry[],
  candidatesFor: (entry: MatchEntry) => Candidate[],
  bankAccountId: string
): Proposal[] {
  const scoredByEntry = new Map<string, Scored[]>();
  const claimCount = new Map<string, number>(); // candidato → nº de linhas que o disputam (mesma conta)

  for (const entry of entries) {
    const list: Scored[] = [];
    for (const c of candidatesFor(entry)) {
      if (Math.abs(c.amount - entry.amount) >= 0.005) continue;
      const days = daysBetween(entry.date, c.date);
      if (days > MAX_DAYS) continue;
      const noAccount = !c.accountId;
      const sameAccount = !noAccount && c.accountId === bankAccountId;
      list.push({ entry, candidate: c, days, sim: stringSimilarity(entry.description, c.label), sameAccount, noAccount });
    }
    // melhor primeiro: mesma conta, depois menor diferença de data, depois nome mais parecido
    list.sort((a, b) => {
      const rank = (s: Scored) => (s.sameAccount ? 0 : s.noAccount ? 1 : 2);
      return rank(a) - rank(b) || a.days - b.days || b.sim - a.sim;
    });
    scoredByEntry.set(entry.id, list);
    for (const s of list) {
      if (s.sameAccount) claimCount.set(s.candidate.key, (claimCount.get(s.candidate.key) ?? 0) + 1);
    }
  }

  const proposals: Proposal[] = [];
  const usedCandidates = new Set<string>();
  const usedEntries = new Set<string>();

  const reasonOf = (s: Scored, extra?: string) => {
    const parts = ["valor exato", s.days === 0 ? "mesma data" : `${s.days}d de diferença`];
    if (s.sameAccount) parts.push("mesma conta");
    if (s.sim >= 0.6) parts.push("nome similar");
    if (extra) parts.push(extra);
    return parts.join(" · ");
  };

  // 1ª passada: 1:1 de alta confiança (só mesma conta)
  for (const entry of entries) {
    const list = (scoredByEntry.get(entry.id) ?? []).filter((s) => s.sameAccount && !usedCandidates.has(s.candidate.key));
    if (list.length === 0) continue;
    const top = list[0];
    if (top.days > HIGH_DAYS) continue;
    const unique = list.length === 1 && (claimCount.get(top.candidate.key) ?? 0) === 1;
    const nameWins = top.sim >= 0.6 && (list[1]?.sim ?? 0) < 0.3 && (claimCount.get(top.candidate.key) ?? 0) === 1;
    if (unique || nameWins) {
      usedCandidates.add(top.candidate.key);
      usedEntries.add(entry.id);
      proposals.push({ kind: "1:1", entryIds: [entry.id], candidates: [top.candidate], confidence: "alta", reason: reasonOf(top), daysDiff: top.days });
    }
  }

  // 2ª passada: o que sobrou vira "revisar" (mesma conta / sem conta) ou "conta divergente"
  for (const entry of entries) {
    if (usedEntries.has(entry.id)) continue;
    const list = (scoredByEntry.get(entry.id) ?? []).filter((s) => !usedCandidates.has(s.candidate.key));
    if (list.length === 0) continue;
    const top = list[0];
    usedCandidates.add(top.candidate.key);
    usedEntries.add(entry.id);
    if (top.sameAccount || top.noAccount) {
      const extra = top.noAccount ? "lançamento sem conta informada" : list.length > 1 ? `${list.length} candidatos` : undefined;
      proposals.push({ kind: "1:1", entryIds: [entry.id], candidates: [top.candidate], confidence: "revisar", reason: reasonOf(top, extra), daysDiff: top.days });
    } else {
      const acc = top.candidate.accountName ? ` (${top.candidate.accountName})` : "";
      proposals.push({
        kind: "1:1",
        entryIds: [entry.id],
        candidates: [top.candidate],
        confidence: "conta_divergente",
        reason: `${reasonOf(top)} · baixado em outra conta${acc}`,
        daysDiff: top.days,
      });
    }
  }

  // 3ª passada — N:1: várias linhas do banco somam um lançamento (ex.: folha paga em vários PIX)
  for (const direction of ["saida", "entrada"] as const) {
    const dummy: MatchEntry = { id: "", date: "", amount: 0, direction, description: "" };
    const pool = candidatesFor(dummy)
      .filter((c) => !usedCandidates.has(c.key) && (c.accountId === bankAccountId || !c.accountId))
      .sort((a, b) => b.amount - a.amount);
    for (const cand of pool) {
      const free = entries
        .filter((e) => e.direction === direction && !usedEntries.has(e.id) && cents(e.amount) < cents(cand.amount) && daysBetween(e.date, cand.date) <= MAX_DAYS)
        .sort((a, b) => daysBetween(a.date, cand.date) - daysBetween(b.date, cand.date) || b.amount - a.amount)
        .slice(0, GROUP_POOL_MAX);
      if (free.length < 2) continue;
      const sols = findSubsets(free.map((e) => ({ id: e.id, cents: cents(e.amount) })), cents(cand.amount), GROUP_SIZE_MAX_ENTRIES);
      if (sols.length === 0) continue;
      const chosen = sols[0];
      const chosenEntries = free.filter((e) => chosen.includes(e.id));
      const maxDays = Math.max(...chosenEntries.map((e) => daysBetween(e.date, cand.date)));
      const sameAccount = cand.accountId === bankAccountId;
      const confidence: Confidence = sameAccount && sols.length === 1 && maxDays <= HIGH_DAYS ? "alta" : "revisar";
      const why = [`${chosenEntries.length} linhas do banco somam o valor do lançamento`];
      if (sols.length > 1) why.push("há outras combinações possíveis");
      if (!sameAccount) why.push("lançamento sem conta informada");
      usedCandidates.add(cand.key);
      for (const e of chosenEntries) usedEntries.add(e.id);
      proposals.push({ kind: "N:1", entryIds: chosenEntries.map((e) => e.id), candidates: [cand], confidence, reason: why.join(" · "), daysDiff: maxDays });
    }
  }

  // 4ª passada — 1:N: uma linha do banco paga vários lançamentos de uma vez
  for (const entry of entries) {
    if (usedEntries.has(entry.id)) continue;
    const pool = candidatesFor(entry).filter(
      (c) =>
        !usedCandidates.has(c.key) &&
        (c.accountId === bankAccountId || !c.accountId) &&
        cents(c.amount) < cents(entry.amount) &&
        daysBetween(entry.date, c.date) <= MAX_DAYS
    );
    // um grupo só combina lançamentos do mesmo tipo (pagamentos com pagamentos, receitas com receitas...)
    const byType = new Map<string, Candidate[]>();
    for (const c of pool) byType.set(c.entityType, [...(byType.get(c.entityType) ?? []), c]);
    for (const list of Array.from(byType.values())) {
      const sorted = list
        .sort((a, b) => daysBetween(a.date, entry.date) - daysBetween(b.date, entry.date) || b.amount - a.amount)
        .slice(0, GROUP_POOL_MAX);
      if (sorted.length < 2) continue;
      const sols = findSubsets(sorted.map((c) => ({ id: c.key, cents: cents(c.amount) })), cents(entry.amount), GROUP_SIZE_MAX_CANDIDATES);
      if (sols.length === 0) continue;
      const chosen = sorted.filter((c) => sols[0].includes(c.key));
      const maxDays = Math.max(...chosen.map((c) => daysBetween(entry.date, c.date)));
      const allSame = chosen.every((c) => c.accountId === bankAccountId);
      const confidence: Confidence = allSame && sols.length === 1 && maxDays <= HIGH_DAYS ? "alta" : "revisar";
      const why = [`${chosen.length} lançamentos somam o valor da linha do banco`];
      if (sols.length > 1) why.push("há outras combinações possíveis");
      if (!allSame) why.push("lançamento sem conta informada");
      for (const c of chosen) usedCandidates.add(c.key);
      usedEntries.add(entry.id);
      proposals.push({ kind: "1:N", entryIds: [entry.id], candidates: chosen, confidence, reason: why.join(" · "), daysDiff: maxDays });
      break; // a linha já foi usada
    }
  }

  return proposals;
}

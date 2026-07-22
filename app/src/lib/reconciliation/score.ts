export type Candidate = {
  key: string;
  entityType: "payment" | "revenue";
  entityId: string;
  label: string;
  amount: number;
  date: string;
};

type ScoredCandidate = Candidate & { score: number; reason: string };

// Termos genéricos que não identificam um fornecedor — ignorados na comparação
const STOPWORDS = new Set([
  "ltda", "sa", "s/a", "s.a", "eireli", "me", "epp", "ss", "inc",
  "servicos", "servico", "comercio", "comercial", "industria", "industrial",
  "solucoes", "solucao", "tecnologia", "tech", "group", "grupo",
  "brasil", "brazil", "do", "da", "de", "dos", "das", "e", "em", "ti",
  "pix", "ted", "doc", "pgto", "pagamento", "transferencia", "enviado", "recebido",
  "cp", "cnpj", "cpf",
]);

// Similaridade entre duas strings (0-1): proporção de tokens significativos em comum
function stringSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)); // ignora stopwords e letras soltas

  const ta = new Set(normalize(a));
  const tb = new Set(normalize(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  let common = 0;
  ta.forEach((t) => { if (tb.has(t)) common++; });
  return (2 * common) / (ta.size + tb.size);
}

function daysDiff(dateA: string, dateB: string): number {
  return Math.abs((new Date(dateA).getTime() - new Date(dateB).getTime()) / 86_400_000);
}

export function scoreCandidates(
  entryAmount: number,
  entryDate: string,
  entryDescription: string,
  candidates: Candidate[]
): ScoredCandidate[] {
  return candidates
    .map((c) => {
      const days = daysDiff(entryDate, c.date);
      const nameSim = stringSimilarity(entryDescription, c.label);
      const amountMatch = Math.abs(c.amount - entryAmount) < 0.01;
      const amountClose = Math.abs(c.amount - entryAmount) / (entryAmount || 1) < 0.05; // dentro de 5%

      let score = 0;
      let reasons: string[] = [];

      // Valor
      if (amountMatch) { score += 50; reasons.push("valor exato"); }
      else if (amountClose) { score += 25; reasons.push("valor próximo"); }

      // Data (decai linearmente até 7 dias)
      if (days <= 7) {
        const dateScore = Math.round(30 * (1 - days / 7));
        score += dateScore;
        if (days === 0) reasons.push("mesma data");
        else if (days <= 3) reasons.push(`${days}d de diferença`);
      }

      // Nome
      if (nameSim > 0.6) { score += 20; reasons.push("nome similar"); }
      else if (nameSim > 0.3) { score += 10; reasons.push("nome parecido"); }

      return { ...c, score, reason: reasons.join(" · ") };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function confidenceLabel(score: number): "alta" | "média" | "baixa" | null {
  if (score >= 70) return "alta";
  if (score >= 40) return "média";
  if (score >= 15) return "baixa";
  return null;
}

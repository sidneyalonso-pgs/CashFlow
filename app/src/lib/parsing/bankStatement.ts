// Parser de extrato bancário no formato real dos bancos (ex: Banco Inter):
// linhas de metadado antes da tabela, separador ";", números em formato BR
// (milhar "." decimal ",") e coluna de saldo corrente por linha.

export type StatementRow = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // negativo = saída, positivo = entrada
  balance: number | null; // saldo do banco após a linha, se disponível
};

export type ParsedStatement = {
  rows: StatementRow[];
  warnings: string[];
};

function parseBRNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? NaN : n;
}

function parseBRDate(raw: string): string | null {
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

export function parseBankStatementText(text: string): ParsedStatement {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delimiter = lines.some((l) => l.includes(";")) ? ";" : ",";

  let headerIdx = lines.findIndex((l) => {
    const lower = l.toLowerCase();
    return lower.includes("data") && lower.includes("valor");
  });
  if (headerIdx === -1) headerIdx = 0;

  const header = splitLine(lines[headerIdx], delimiter).map((h) => h.toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("data"));
  const descIdx = header.findIndex((h) => h.includes("descri"));
  const valueIdx = header.findIndex((h) => h.includes("valor"));
  const balanceIdx = header.findIndex((h) => h.includes("saldo"));

  const rows: StatementRow[] = [];
  const warnings: string[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);
    if (cols.length < 3) continue;

    const isoDate = dateIdx >= 0 ? parseBRDate(cols[dateIdx] ?? "") : null;
    if (!isoDate) continue; // linha que não é uma transação (ex: rodapé)

    const amount = valueIdx >= 0 ? parseBRNumber(cols[valueIdx] ?? "") : NaN;
    if (Number.isNaN(amount)) continue;

    const balanceRaw = balanceIdx >= 0 ? parseBRNumber(cols[balanceIdx] ?? "") : NaN;

    rows.push({
      date: isoDate,
      description: descIdx >= 0 ? cols[descIdx] ?? "" : "",
      amount,
      balance: Number.isNaN(balanceRaw) ? null : balanceRaw,
    });
  }

  for (let i = 1; i < rows.length; i++) {
    const prevBalance = rows[i - 1].balance;
    const currentBalance = rows[i].balance;
    if (prevBalance === null || currentBalance === null) continue;

    const expected = Math.round((prevBalance + rows[i].amount) * 100) / 100;
    if (Math.abs(expected - currentBalance) > 0.01) {
      warnings.push(
        `Linha ${i + 1} (${rows[i].date}): saldo esperado R$ ${expected.toFixed(2)}, mas o extrato mostra R$ ${currentBalance.toFixed(
          2
        )} — pode haver um lançamento faltando ou fora de ordem.`
      );
    }
  }

  return { rows, warnings };
}

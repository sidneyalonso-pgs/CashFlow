// Parsers de extrato bancário: CSV/Excel (qualquer layout cujo cabeçalho seja reconhecível) e OFX.
//
// CSV/Excel: o arquivo vira uma matriz de células; o parser procura a linha de cabeçalho (os bancos
// põem linhas de metadado antes da tabela) e descobre as colunas pelo NOME, não pela posição.
// Reconhece: valor com sinal, valor sem sinal + coluna de direção (IN/OUT, C/D), colunas separadas
// de crédito e débito, saldo corrente e identificador único da transação.

export type StatementRow = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // negativo = saída, positivo = entrada
  balance: number | null; // saldo do banco após a linha, se disponível
  externalId?: string; // identificador único da transação no banco (FITID do OFX, ID Transação...)
};

export type ParsedStatement = {
  rows: StatementRow[];
  warnings: string[];
  /** saldo final informado pelo arquivo (OFX LEDGERBAL), quando existe */
  closing?: { date: string | null; balance: number };
};

type Cell = string | number | boolean | Date | null | undefined;

const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function parseAmount(cell: Cell): number {
  if (typeof cell === "number") return cell;
  if (cell === null || cell === undefined || cell instanceof Date || typeof cell === "boolean") return NaN;
  let s = String(cell).trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return NaN;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/-$/.test(s)) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  if (Number.isNaN(n)) return NaN;
  return negative ? -Math.abs(n) : n;
}

function isoFromParts(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(cell: Cell): string | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (cell instanceof Date) {
    return isoFromParts(cell.getUTCFullYear(), cell.getUTCMonth() + 1, cell.getUTCDate());
  }
  if (typeof cell === "number") {
    // serial de data do Excel (dias desde 30/12/1899)
    if (cell < 20000 || cell > 80000) return null;
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(cell) * 86_400_000);
    return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const s = String(cell).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return isoFromParts(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);
  return null;
}

function directionSign(cell: Cell): 1 | -1 | null {
  const v = norm(cell);
  if (["in", "c", "credito", "credit", "entrada", "cr"].includes(v)) return 1;
  if (["out", "d", "debito", "debit", "saida", "db"].includes(v)) return -1;
  return null;
}

type Columns = {
  date: number;
  signedAmount: number;
  amount: number;
  credit: number;
  debit: number;
  direction: number;
  description: number;
  descriptionFallback: number[];
  channel: number;
  balance: number;
  externalId: number;
};

const findIdx = (header: string[], test: (h: string) => boolean) => header.findIndex((h) => h && test(h));

function detectColumns(header: string[]): Columns {
  const date =
    findIdx(header, (h) => h === "data") >= 0
      ? findIdx(header, (h) => h === "data")
      : findIdx(header, (h) => /^data (lancamento|movimento|movimentacao|transacao|da transacao|do lancamento)$/.test(h)) >= 0
        ? findIdx(header, (h) => /^data (lancamento|movimento|movimentacao|transacao|da transacao|do lancamento)$/.test(h))
        : findIdx(header, (h) => h.includes("data") && !/contraparte|saldo|vencimento/.test(h));

  const signedAmount = findIdx(header, (h) => h === "valor assinado" || h === "valor com sinal");
  const amount =
    findIdx(header, (h) => h === "valor") >= 0
      ? findIdx(header, (h) => h === "valor")
      : findIdx(header, (h) => h.includes("valor") && !/saldo|fee|tarifa|total|assinado/.test(h));
  const credit = findIdx(header, (h) => /^(credito|entrada|creditos|entradas)( \(r\$\))?$/.test(h) || h === "valor credito");
  const debit = findIdx(header, (h) => /^(debito|saida|debitos|saidas)( \(r\$\))?$/.test(h) || h === "valor debito");
  const direction = findIdx(header, (h) => /^(direcao|natureza|d\/c|c\/d|debito\/credito|credito\/debito|sentido)$/.test(h));

  const descExact = findIdx(header, (h) => h.startsWith("descri"));
  const fallbackNames = ["historico", "nome contraparte", "contraparte", "favorecido", "beneficiario", "memo", "lancamento", "nome"];
  const descriptionFallback = fallbackNames
    .map((n) => findIdx(header, (h) => h === n))
    .filter((i) => i >= 0 && i !== date);

  const channel = findIdx(header, (h) => h === "canal");
  const balance =
    findIdx(header, (h) => h === "saldo depois") >= 0
      ? findIdx(header, (h) => h === "saldo depois")
      : findIdx(header, (h) => h.includes("saldo") && !/antes|anterior|inicial/.test(h));
  const externalId = findIdx(header, (h) => /^(id transacao|fitid|id da transacao|codigo da transacao|autenticacao)$/.test(h));

  return {
    date,
    signedAmount,
    amount,
    credit,
    debit,
    direction,
    description: descExact,
    descriptionFallback,
    channel,
    balance,
    externalId,
  };
}

/** Procura, nas primeiras linhas, a que parece o cabeçalho: tem coluna de data e de valor (ou crédito/débito). */
function findHeaderRow(matrix: Cell[][]): number {
  const limit = Math.min(matrix.length, 40);
  for (let i = 0; i < limit; i++) {
    const header = (matrix[i] ?? []).map(norm);
    const hasDate = header.some((h) => h.includes("data"));
    const hasValue = header.some((h) => h.includes("valor") || /^(credito|debito|entrada|saida)/.test(h));
    if (hasDate && hasValue) return i;
  }
  return -1;
}

export function parseBankStatementMatrix(matrix: Cell[][]): ParsedStatement {
  const rows: StatementRow[] = [];
  const warnings: string[] = [];

  const headerIdx = findHeaderRow(matrix);
  if (headerIdx === -1) {
    return {
      rows,
      warnings: ['Não encontrei a linha de cabeçalho (precisa ter colunas "Data" e "Valor", ou "Crédito" e "Débito").'],
    };
  }

  const header = (matrix[headerIdx] ?? []).map(norm);
  const col = detectColumns(header);
  if (col.date < 0) return { rows, warnings: ['Não encontrei a coluna de data no cabeçalho.'] };
  const hasAmountSource = col.signedAmount >= 0 || col.amount >= 0 || (col.credit >= 0 && col.debit >= 0);
  if (!hasAmountSource) return { rows, warnings: ['Não encontrei a coluna de valor no cabeçalho.'] };

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const cells = matrix[i] ?? [];
    const isoDate = parseDate(cells[col.date]);
    if (!isoDate) continue; // linha que não é transação (rodapé, total...)

    let amount = NaN;
    if (col.signedAmount >= 0) {
      amount = parseAmount(cells[col.signedAmount]);
    } else if (col.amount >= 0) {
      amount = parseAmount(cells[col.amount]);
      if (!Number.isNaN(amount) && col.direction >= 0) {
        const sign = directionSign(cells[col.direction]);
        if (sign !== null) amount = sign * Math.abs(amount);
      }
    } else {
      const credit = parseAmount(cells[col.credit]);
      const debit = parseAmount(cells[col.debit]);
      const c = Number.isNaN(credit) ? 0 : Math.abs(credit);
      const d = Number.isNaN(debit) ? 0 : Math.abs(debit);
      amount = c > 0 || d > 0 ? c - d : NaN;
    }
    if (Number.isNaN(amount)) continue;

    let description = "";
    if (col.description >= 0) {
      description = String(cells[col.description] ?? "").trim();
    } else {
      const parts: string[] = [];
      for (const idx of col.descriptionFallback) {
        const v = String(cells[idx] ?? "").trim();
        if (v && !parts.includes(v)) {
          parts.push(v);
          break; // só a primeira fonte preenchida
        }
      }
      if (col.channel >= 0) {
        const ch = String(cells[col.channel] ?? "").trim();
        if (ch) parts.push(ch);
      }
      description = parts.join(" - ");
    }

    const balanceRaw = col.balance >= 0 ? parseAmount(cells[col.balance]) : NaN;
    const externalIdRaw = col.externalId >= 0 ? String(cells[col.externalId] ?? "").trim() : "";

    rows.push({
      date: isoDate,
      description,
      amount: Math.round(amount * 100) / 100,
      balance: Number.isNaN(balanceRaw) ? null : balanceRaw,
      externalId: externalIdRaw || undefined,
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

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBankStatementText(text: string): ParsedStatement {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delimiter = lines.some((l) => l.includes(";")) ? ";" : ",";
  return parseBankStatementMatrix(lines.map((l) => splitCsvLine(l, delimiter)));
}

// Parser de extrato bancário no formato OFX (Open Financial Exchange).
// Cada transação já vem em campos estruturados (data, valor, descrição, ID único do banco),
// então não precisa adivinhar layout de coluna como no CSV/Excel.
export function parseOfxStatement(text: string): ParsedStatement {
  const rows: StatementRow[] = [];
  const warnings: string[] = [];

  const blocks = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];

  for (const block of blocks) {
    const amountMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);
    const fitIdMatch = block.match(/<FITID>([^<\r\n]+)/i);

    if (!amountMatch || !dateMatch) continue;

    // alguns bancos exportam o valor com vírgula decimal
    const amount = parseFloat(amountMatch[1].trim().replace(",", "."));
    if (Number.isNaN(amount)) continue;

    const rawDate = dateMatch[1].trim().slice(0, 8); // YYYYMMDD — ignora hora se vier junto
    if (rawDate.length !== 8) continue;
    const isoDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    rows.push({
      date: isoDate,
      description: (memoMatch?.[1] ?? nameMatch?.[1] ?? "").trim(),
      amount,
      balance: null,
      externalId: fitIdMatch?.[1]?.trim() || undefined,
    });
  }

  if (rows.length === 0) {
    warnings.push('Não encontrei nenhuma transação ("STMTTRN") no arquivo OFX.');
  }

  let closing: ParsedStatement["closing"];
  const ledger = text.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/i);
  if (ledger) {
    const bal = ledger[1].match(/<BALAMT>([^<\r\n]+)/i);
    const asOf = ledger[1].match(/<DTASOF>([^<\r\n]+)/i);
    const balance = bal ? parseFloat(bal[1].trim().replace(",", ".")) : NaN;
    if (!Number.isNaN(balance)) {
      const d = asOf?.[1]?.trim().slice(0, 8);
      closing = {
        date: d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null,
        balance,
      };
    }
  }

  return { rows, warnings, closing };
}

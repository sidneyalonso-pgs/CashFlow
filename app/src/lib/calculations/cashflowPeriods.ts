// Divide um intervalo em "baldes" (semana/mês/trimestre) para o Resumo Executivo do Cash Flow.
// Semanas seguem o padrão da planilha de referência: blocos de segunda a sexta,
// com o primeiro/último bloco do mês recortado nas bordas do mês.

export type Bucket = { label: string; start: string; end: string };

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDDMM(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeekBuckets(year: number, month: number): Bucket[] {
  // month: 1-12
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));

  const buckets: Bucket[] = [];
  let cursor = new Date(firstDay);
  let weekNumber = 1;

  while (cursor <= lastDay) {
    // dia da semana ISO: 1=segunda ... 7=domingo
    const isoDow = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    const daysUntilFriday = 5 - isoDow; // pode ser negativo se já passou da sexta
    let weekEnd: Date;
    if (daysUntilFriday >= 0) {
      weekEnd = new Date(cursor);
      weekEnd.setUTCDate(cursor.getUTCDate() + daysUntilFriday);
    } else {
      // cursor caiu em sábado/domingo (não deveria, pois sempre avançamos pra segunda), guarda-chuva
      weekEnd = new Date(cursor);
    }
    if (weekEnd > lastDay) weekEnd = new Date(lastDay);

    buckets.push({
      label: `Semana ${weekNumber} (${formatDDMM(weekEnd)})`,
      start: toISODate(cursor),
      end: toISODate(weekEnd),
    });

    // próxima segunda-feira
    const next = new Date(weekEnd);
    next.setUTCDate(weekEnd.getUTCDate() + 1);
    const nextIsoDow = next.getUTCDay() === 0 ? 7 : next.getUTCDay();
    if (nextIsoDow !== 1) {
      next.setUTCDate(next.getUTCDate() + (8 - nextIsoDow));
    }
    cursor = next;
    weekNumber++;
  }

  return buckets;
}

export function getMonthBuckets(year: number): Bucket[] {
  return MONTH_NAMES.map((name, i) => {
    const start = new Date(Date.UTC(year, i, 1));
    const end = new Date(Date.UTC(year, i + 1, 0));
    return { label: `${name}/${year}`, start: toISODate(start), end: toISODate(end) };
  });
}

export function getQuarterBuckets(year: number): Bucket[] {
  return [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0));
    return { label: `T${q}/${year}`, start: toISODate(start), end: toISODate(end) };
  });
}

import Decimal from "decimal.js";

export type Col = { key: string; label: string; from: string; to: string };
export type DreRow = {
  key: string;
  label: string;
  kind: "grupo" | "total" | "manual";
  vals: number[][]; // [coluna][0=real,1=projetado]
  filhos?: { label: string; vals: number[][] }[];
};

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export function colunasMensais(ano: number): Col[] {
  return MESES.map((m, i) => {
    const mm = String(i + 1).padStart(2, "0");
    return { key: `${ano}-${mm}`, label: `${m}-${String(ano).slice(2)}`, from: `${ano}-${mm}-01`, to: iso(new Date(Date.UTC(ano, i + 1, 0))) };
  });
}

/** Semanas (segunda a domingo) do mês, cortadas nos limites do mês. */
export function colunasSemanais(mes: string): Col[] {
  const [a, m] = mes.split("-").map(Number);
  const ini = new Date(Date.UTC(a, m - 1, 1));
  const fim = new Date(Date.UTC(a, m, 0));
  const cols: Col[] = [];
  let cur = ini;
  while (cur <= fim) {
    const dow = (cur.getUTCDay() + 6) % 7; // 0 = segunda
    let end = new Date(cur.getTime() + (6 - dow) * 86400000);
    if (end > fim) end = fim;
    cols.push({ key: iso(cur), label: `S${cols.length + 1} · ${dm(iso(cur))}–${dm(iso(end))}`, from: iso(cur), to: iso(end) });
    cur = new Date(end.getTime() + 86400000);
  }
  return cols;
}

const zeros = (n: number) => Array.from({ length: n }, () => [new Decimal(0), new Decimal(0)]);

function classificaDespesa(fpa: string | null, categoria: string): string {
  if (categoria === "Depreciação") return "dep";
  const n = fpa?.trim().charAt(0);
  if (n === "2") return "ded";
  if (n === "3") return "custos";
  if (n === "4") return "ga";
  if (n === "5") return "desp_fin";
  if (n === "6") return "ir";
  return "nao_class";
}

function classificaReceita(fpa: string | null, categoria: string): string {
  if (categoria === "Outras Receitas") return "rec";
  if (fpa?.trim().startsWith("5")) return "rec_fin";
  return "rec";
}

export function montaDre(cols: Col[], payments: any[], revenues: any[], pdd: Record<string, number>): DreRow[] {
  const n = cols.length;
  const acc: Record<string, Map<string, Decimal[][]>> = {};
  const add = (grupo: string, cat: string, date: string, amount: number, real: boolean) => {
    const ci = cols.findIndex((c) => date >= c.from && date <= c.to);
    if (ci < 0) return;
    const g = (acc[grupo] ??= new Map());
    const arr = g.get(cat) ?? zeros(n);
    const k = real ? 0 : 1;
    arr[ci][k] = arr[ci][k].plus(amount);
    g.set(cat, arr);
  };

  for (const p of payments) {
    if (p.status !== "pago" && p.status !== "agendado") continue;
    const cat = p.categories?.name ?? "Sem categoria";
    const grupo = classificaDespesa(p.categories?.fpa_classification ?? null, cat);
    add(grupo, cat, p.competence_date, -Number(p.gross_amount), p.status === "pago");
  }
  for (const r of revenues) {
    if (r.status !== "recebida" && r.status !== "estimada") continue;
    const cat = r.categories?.name ?? "Sem categoria";
    const grupo = classificaReceita(r.categories?.fpa_classification ?? null, cat);
    const real = r.status === "recebida";
    add(grupo, cat, real ? r.realized_date : r.expected_date, Number(real ? r.realized_amount : r.expected_amount), real);
  }

  const totalGrupo = (g: string) => {
    const t = zeros(n);
    for (const arr of (acc[g] ?? new Map<string, Decimal[][]>()).values())
      for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) t[i][k] = t[i][k].plus(arr[i][k]);
    return t;
  };
  const peso = (vals: number[][]) => vals.flat().reduce((s, x) => s + Math.abs(x), 0);
  const filhos = (g: string) =>
    Array.from((acc[g] ?? new Map<string, Decimal[][]>()).entries())
      .map(([label, arr]) => ({ label, vals: arr.map((c) => c.map((x) => x.toNumber())) }))
      .sort((a, b) => peso(b.vals) - peso(a.vals));
  const num = (t: Decimal[][]) => t.map((c) => c.map((x) => x.toNumber()));
  const soma = (...ts: Decimal[][][]) => {
    const t = zeros(n);
    for (const x of ts) for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) t[i][k] = t[i][k].plus(x[i][k]);
    return t;
  };

  const rec = totalGrupo("rec");
  const pddT = zeros(n);
  cols.forEach((c, i) => {
    pddT[i][0] = new Decimal(pdd[c.key] ?? 0);
  });
  const ded = totalGrupo("ded");
  const recLiq = soma(rec, pddT, ded);
  const custos = totalGrupo("custos");
  const ga = totalGrupo("ga");
  const naoClass = totalGrupo("nao_class");
  const ebitda = soma(recLiq, custos, ga, naoClass);
  const dep = totalGrupo("dep");
  const ebit = soma(ebitda, dep);
  const recFin = totalGrupo("rec_fin");
  const despFin = totalGrupo("desp_fin");
  const ebt = soma(ebit, recFin, despFin);
  const ir = totalGrupo("ir");
  const lucro = soma(ebt, ir);

  const rows: DreRow[] = [
    { key: "rec", label: "Receita Bruta", kind: "grupo", vals: num(rec), filhos: filhos("rec") },
    { key: "pdd", label: "(-) PDD (lançamento manual)", kind: "manual", vals: num(pddT) },
    { key: "ded", label: "(-) Deduções da Receita", kind: "grupo", vals: num(ded), filhos: filhos("ded") },
    { key: "recliq", label: "(=) Receita Líquida", kind: "total", vals: num(recLiq) },
    { key: "custos", label: "(-) Custos e Despesas Operacionais", kind: "grupo", vals: num(custos), filhos: filhos("custos") },
    { key: "ga", label: "(-) Despesas Gerais e Administrativas", kind: "grupo", vals: num(ga), filhos: filhos("ga") },
  ];
  if (naoClass.some((c) => c.some((x) => !x.isZero())))
    rows.push({ key: "nao", label: "(-) Sem classificação FP&A", kind: "grupo", vals: num(naoClass), filhos: filhos("nao_class") });
  rows.push(
    { key: "ebitda", label: "(=) EBITDA", kind: "total", vals: num(ebitda) },
    { key: "dep", label: "(-) Depreciação e Amortização", kind: "grupo", vals: num(dep), filhos: filhos("dep") },
    { key: "ebit", label: "(=) EBIT", kind: "total", vals: num(ebit) },
    { key: "recfin", label: "(+) Receitas Financeiras", kind: "grupo", vals: num(recFin), filhos: filhos("rec_fin") },
    { key: "despfin", label: "(-) Despesas Financeiras", kind: "grupo", vals: num(despFin), filhos: filhos("desp_fin") },
    { key: "ebt", label: "(=) Resultado Antes dos Impostos", kind: "total", vals: num(ebt) },
    { key: "ir", label: "(-) IRPJ e CSLL", kind: "grupo", vals: num(ir), filhos: filhos("ir") },
    { key: "lucro", label: "(=) Lucro (Prejuízo) Líquido", kind: "total", vals: num(lucro) }
  );
  return rows;
}

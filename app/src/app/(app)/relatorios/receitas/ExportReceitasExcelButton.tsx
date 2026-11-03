"use client";

import * as XLSX from "xlsx";
import type { RelatorioReceitas } from "./dados";

const FMT_BRL = "#,##0.00";
const FMT_DATA = "dd/mm/yyyy";

/** Data ISO (AAAA-MM-DD) como data do Excel; AAAA-MM vira texto "MM/AAAA". */
function celulaData(iso: string | null): XLSX.CellObject {
  if (!iso) return { t: "s", v: "" };
  if (iso.length === 7) return { t: "s", v: `${iso.slice(5, 7)}/${iso.slice(0, 4)}` };
  const serial = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000 + 25569;
  return { t: "n", v: serial, z: FMT_DATA };
}
const txt = (v: string): XLSX.CellObject => ({ t: "s", v });
const num = (v: number, f?: string): XLSX.CellObject => ({ t: "n", v, z: FMT_BRL, ...(f ? { f } : {}) });

function nomeAba(label: string, usados: Set<string>): string {
  let n = label.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Aba";
  let i = 2;
  const base = n;
  while (usados.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${i++}`;
  usados.add(n.toLowerCase());
  return n;
}

function aba(linhas: XLSX.CellObject[][], larguras: number[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  linhas.forEach((linha, r) =>
    linha.forEach((c, k) => {
      if (c && !(c.t === "s" && c.v === "")) ws[XLSX.utils.encode_cell({ r, c: k })] = c;
    })
  );
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(linhas.length - 1, 0), c: Math.max(...linhas.map((l) => l.length), 1) - 1 } });
  ws["!cols"] = larguras.map((wch) => ({ wch }));
  return ws;
}

export function ExportReceitasExcelButton({ mes, empresa, rel }: { mes: string; empresa: string; rel: RelatorioReceitas }) {
  function exportar() {
    const wb = XLSX.utils.book_new();
    const usados = new Set<string>(["resumo", "repasses"]);
    const mesLabel = `${mes.slice(5, 7)}/${mes.slice(0, 4)}`;

    // ---- Resumo ----
    const r: XLSX.CellObject[][] = [];
    r.push([txt(`Receitas ${mesLabel} — ${empresa}`)]);
    r.push([txt("Competência mensal. Receita faturada (Bets, mensalidade, China) na competência da fatura.")]);
    r.push([]);
    r.push([txt("RECEITA POR TIPO"), txt("REALIZADO"), txt("PROJETADO"), txt("TOTAL")]);
    const ini = r.length + 1; // linha (1-based) do primeiro tipo
    rel.tipos.forEach((t, i) => {
      const lin = ini + i;
      r.push([txt(t.label), num(t.real), num(t.projetado), num(t.total, `B${lin}+C${lin}`)]);
    });
    const fim = r.length;
    const linBruta = r.length + 1;
    r.push([
      txt("RECEITA BRUTA"),
      num(rel.receitaBruta.real, `SUM(B${ini}:B${fim})`),
      num(rel.receitaBruta.projetado, `SUM(C${ini}:C${fim})`),
      num(rel.receitaBruta.total, `SUM(D${ini}:D${fim})`),
    ]);
    r.push([]);
    r.push([txt("(-) REPASSES"), txt("VALOR DO REPASSE"), txt("PERÍODO"), txt("DATA DO REPASSE OU RECEBIMENTO"), txt("STATUS")]);
    const iniRep = r.length + 1;
    for (const p of rel.repasses) r.push([txt(p.empresa), num(-p.valor), txt(p.periodo ?? "—"), celulaData(p.data), txt(p.status)]);
    const fimRep = r.length;
    const linTotRep = r.length + 1;
    r.push([txt("TOTAL DE REPASSES"), num(-rel.totalRepasses, rel.repasses.length ? `SUM(B${iniRep}:B${fimRep})` : undefined)]);
    r.push([]);
    const linFeePix = ini + rel.tipos.findIndex((t) => t.label === "Fee Pix");
    r.push([txt("FEE PIX APÓS REPASSES"), num(rel.feePixLiquido, `D${linFeePix}+B${linTotRep}`)]);
    r.push([txt("RECEITA LÍQUIDA"), num(rel.receitaLiquida, `D${linBruta}+B${linTotRep}`)]);
    XLSX.utils.book_append_sheet(wb, aba(r, [42, 20, 22, 30, 12]), "Resumo");

    // ---- uma aba por receita: o dia a dia com o valor ----
    for (const t of rel.tipos) {
      if (t.itens.length === 0) continue;
      const l: XLSX.CellObject[][] = [[txt("COMPETÊNCIA"), txt("CAIXA (RECEBIMENTO OU PREVISÃO)"), txt("LANÇADO EM"), txt("DESCRIÇÃO"), txt("STATUS"), txt("VALOR")]];
      for (const i of t.itens) l.push([celulaData(i.competencia), celulaData(i.caixa), celulaData(i.lancadoEm), txt(i.descricao), txt(i.status === "recebida" ? "Recebida" : "Projetada"), num(i.valor)]);
      l.push([]);
      l.push([txt("TOTAL"), txt(""), txt(""), txt(""), txt(""), num(t.total, `SUM(F2:F${t.itens.length + 1})`)]);
      XLSX.utils.book_append_sheet(wb, aba(l, [14, 30, 14, 52, 12, 18]), nomeAba(t.label, usados));
    }

    // ---- Repasses: o dia a dia ----
    const rp: XLSX.CellObject[][] = [[txt("DATA DO REPASSE OU RECEBIMENTO"), txt("EMPRESA"), txt("PERÍODO"), txt("STATUS"), txt("VALOR DO REPASSE")]];
    for (const p of rel.repasses) rp.push([celulaData(p.data), txt(p.empresa), txt(p.periodo ?? "—"), txt(p.status), num(-p.valor)]);
    rp.push([]);
    rp.push([txt("TOTAL"), txt(""), txt(""), txt(""), num(-rel.totalRepasses, rel.repasses.length ? `SUM(E2:E${rel.repasses.length + 1})` : undefined)]);
    XLSX.utils.book_append_sheet(wb, aba(rp, [30, 58, 26, 12, 20]), "Repasses");

    XLSX.writeFile(wb, `Receitas_${mes}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      className="bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors"
    >
      Extrair em Excel
    </button>
  );
}

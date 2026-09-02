"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NO_REPASSE_MODELS = ["mensalidade", "mensalidade_intro", "bet", "bets"];
const isMensalidade = (modelo: string) => modelo?.startsWith("mensalidade");
const isBets = (modelo: string) => modelo === "bet" || modelo === "bets";

function psValues(inv: { modelo: string; total: number; total_faturado: number; total_repasse: number }) {
  const noRepasse = NO_REPASSE_MODELS.includes(inv.modelo);
  const receita = noRepasse ? Number(inv.total) : Number(inv.total_faturado) - Number(inv.total_repasse);
  const repasse = noRepasse ? 0 : Number(inv.total_repasse);
  return { receita, repasse };
}

/** Data que representa o lançamento no mês: a baixa se já saiu, senão a expectativa. */
function dataOperativa(inv: { status: string; data_pgto: string | null; data_vencimento: string | null; data_repasse: string | null; competencia: string }) {
  if (inv.status === "pago" && inv.data_pgto) return inv.data_pgto;
  return inv.data_vencimento ?? inv.data_repasse ?? `${inv.competencia}-01`;
}

function formatDateBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function formatNumberBR(v: number) {
  return v.toFixed(2).replace(".", ",");
}

/** Mesma lógica e mesmos números da tela — o CSV é só a versão para anexar/enviar por e-mail. */
export function ExportMonthlyReportButton({ mes, companyId }: { mes: string; companyId?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const supabase = createClient();
    const [ano, mesNum] = mes.split("-").map(Number);
    const from = `${mes}-01`;
    const to = new Date(Date.UTC(ano, mesNum, 0)).toISOString().slice(0, 10);

    let query = supabase
      .from("billing_invoices")
      .select("modelo, status, total, total_faturado, total_repasse, data_pgto, data_vencimento, data_repasse, competencia, billing_clients(razao)")
      .in("status", ["pago", "pendente"]);
    if (companyId) query = query.eq("company_id", companyId);

    const { data } = await query;
    const rows = (data ?? [])
      .map((r: any) => ({ ...r, ...psValues(r), data: dataOperativa(r) }))
      .filter((r: any) => r.data >= from && r.data <= to)
      .sort((a: any, b: any) => a.data.localeCompare(b.data));

    const header = ["Data", "Tipo", "Cliente", "Competência", "Modelo", "Valor", "Status"];
    const linhas: string[][] = [];
    for (const r of rows) {
      const statusLabel = r.status === "pago" ? "Baixado" : "Pendente";
      if (r.repasse > 0) linhas.push([formatDateBR(r.data), "Repasse", r.billing_clients?.razao ?? "", r.competencia, r.modelo, formatNumberBR(r.repasse), statusLabel]);
      if (isMensalidade(r.modelo) && r.receita > 0) linhas.push([formatDateBR(r.data), "Mensalidade", r.billing_clients?.razao ?? "", r.competencia, r.modelo, formatNumberBR(r.receita), statusLabel]);
      if (isBets(r.modelo) && r.receita > 0) linhas.push([formatDateBR(r.data), "Bets", r.billing_clients?.razao ?? "", r.competencia, r.modelo, formatNumberBR(r.receita), statusLabel]);
    }

    const csvLines = [
      header.join(";"),
      ...linhas.map((cols) => cols.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")),
    ];

    const blob = new Blob(["﻿" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `faturamento_${mes}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors disabled:opacity-60"
    >
      {loading ? "Gerando..." : "Exportar CSV"}
    </button>
  );
}

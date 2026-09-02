"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NO_REPASSE_MODELS = ["mensalidade", "mensalidade_intro", "bet", "bets"];
const isMensalidade = (modelo: string) => modelo?.startsWith("mensalidade");

function psValues(inv: { modelo: string; total: number; total_faturado: number; total_repasse: number }) {
  const noRepasse = NO_REPASSE_MODELS.includes(inv.modelo);
  const receita = noRepasse ? Number(inv.total) : Number(inv.total_faturado) - Number(inv.total_repasse);
  const repasse = noRepasse ? 0 : Number(inv.total_repasse);
  return { receita, repasse };
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
      .select("modelo, total, total_faturado, total_repasse, data_pgto, competencia, billing_clients(razao)")
      .eq("status", "pago")
      .gte("data_pgto", from)
      .lte("data_pgto", to)
      .order("data_pgto");
    if (companyId) query = query.eq("company_id", companyId);

    const { data } = await query;
    const rows = (data ?? []).map((r: any) => ({ ...r, ...psValues(r) }));

    const header = ["Data da baixa", "Tipo", "Cliente", "Competência", "Modelo", "Valor"];
    const csvLines = [
      header.join(";"),
      ...rows.map((r: any) => {
        const tipo = r.repasse > 0 ? "Repasse pago" : isMensalidade(r.modelo) ? "Mensalidade recebida" : "Receita recebida";
        const valor = r.repasse > 0 ? r.repasse : r.receita;
        return [formatDateBR(r.data_pgto), tipo, r.billing_clients?.razao ?? "", r.competencia, r.modelo, formatNumberBR(valor)]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";");
      }),
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

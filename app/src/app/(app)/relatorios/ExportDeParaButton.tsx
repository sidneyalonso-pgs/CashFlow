"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { companyLabel } from "@/lib/format";

function monthOptions() {
  const now = new Date();
  const opts: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

function monthBounds(value: string) {
  const [y, m] = value.split("-").map(Number);
  const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);
  return { start, end };
}

type ChartAccountRef = { codigo: string; descricao: string } | null;

export function ExportDeParaButton({
  companies,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
}) {
  const options = monthOptions();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [month, setMonth] = useState(options[0].value);
  const [companyId, setCompanyId] = useState("");

  async function handleExport() {
    setLoading(true);
    setCount(null);
    const supabase = createClient();
    const { start, end } = monthBounds(month);

    let paymentsQuery = supabase
      .from("payments")
      .select(
        "description, paid_amount, gross_amount, effective_payment_date, companies(legal_name, trade_name), chart_of_accounts:chart_account_id(codigo, descricao), bank_accounts:paying_bank_account_id(nickname, bank_name, chart_of_accounts(codigo, descricao))"
      )
      .eq("status", "pago")
      .is("deleted_at", null)
      .gte("effective_payment_date", start)
      .lte("effective_payment_date", end);

    let revenuesQuery = supabase
      .from("revenues")
      .select(
        "description, realized_amount, realized_date, companies(legal_name, trade_name), chart_of_accounts:chart_account_id(codigo, descricao), bank_accounts:receiving_bank_account_id(nickname, bank_name, chart_of_accounts(codigo, descricao))"
      )
      .eq("status", "recebida")
      .is("deleted_at", null)
      .gte("realized_date", start)
      .lte("realized_date", end);

    if (companyId) {
      paymentsQuery = paymentsQuery.eq("company_id", companyId);
      revenuesQuery = revenuesQuery.eq("company_id", companyId);
    }

    const [{ data: payments }, { data: revenues }] = await Promise.all([paymentsQuery, revenuesQuery]);

    type Row = {
      date: string;
      tipo: string;
      empresa: string;
      descricao: string;
      valor: number;
      debito: ChartAccountRef;
      credito: ChartAccountRef;
    };

    const rows: Row[] = [
      ...(payments ?? []).map((p: any): Row => ({
        date: p.effective_payment_date,
        tipo: "Pagamento",
        empresa: companyLabel(p.companies),
        descricao: p.description ?? "",
        valor: Number(p.paid_amount ?? p.gross_amount),
        debito: p.chart_of_accounts ?? null,
        credito: p.bank_accounts?.chart_of_accounts ?? null,
      })),
      ...(revenues ?? []).map((r: any): Row => ({
        date: r.realized_date,
        tipo: "Receita",
        empresa: companyLabel(r.companies),
        descricao: r.description ?? "",
        valor: Number(r.realized_amount),
        debito: r.bank_accounts?.chart_of_accounts ?? null,
        credito: r.chart_of_accounts ?? null,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const accountLabel = (a: ChartAccountRef) => (a ? `${a.codigo} - ${a.descricao}` : "");

    const header = ["Data", "Tipo", "Empresa", "Descrição", "Valor", "Débito", "Crédito"];

    const csvLines = [
      header.join(";"),
      ...rows.map((r) =>
        [
          formatDateBR(r.date),
          r.tipo,
          r.empresa,
          r.descricao,
          formatNumberBR(r.valor),
          accountLabel(r.debito),
          accountLabel(r.credito),
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ];

    const blob = new Blob(["﻿" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const monthLabel = options.find((o) => o.value === month)?.label.replace(/\s+/g, "_") ?? month;
    link.download = `De_Para_Contabil_${monthLabel}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setCount(rows.length);
    setLoading(false);
  }

  const selectCls = "rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-ps-muted mb-1">Mês e ano</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls + " w-full"}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ps-muted mb-1">Empresa</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={selectCls + " w-full"}>
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.trade_name || c.legal_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={loading}
          className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Gerando..." : "Exportar CSV"}
        </button>
        {count !== null && (
          <span className="text-sm text-ps-muted">
            {count === 0 ? "Nenhum lançamento no período." : `${count} lançamento${count > 1 ? "s" : ""} exportado${count > 1 ? "s" : ""}.`}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatNumberBR(v: number | string | null) {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toFixed(2).replace(".", ",");
}

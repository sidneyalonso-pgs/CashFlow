"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { companyLabel } from "@/lib/format";

const COST_TYPE_LABELS: Record<string, string> = {
  despesas: "Despesas",
  custo_direto: "Custo direto",
};

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function lastDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function ExportPaymentsButton({
  companies,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string; trade_name: string | null }>;
  bankAccounts: Array<{ id: string; nickname: string | null; bank_name: string }>;
}) {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(lastDayOfMonth());
  const [companyId, setCompanyId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  async function handleExport() {
    setLoading(true);
    setCount(null);
    const supabase = createClient();

    let query = supabase
      .from("payments")
      .select(
        "description, gross_amount, paid_amount, due_date, effective_payment_date, status, cost_type, fixed_variable, recurring, companies(legal_name, trade_name), suppliers(legal_name), categories(name), cost_centers(name), bank_accounts:paying_bank_account_id(nickname, bank_name)"
      )
      .is("deleted_at", null)
      .neq("status", "cancelado")
      .or(`and(due_date.gte.${dateFrom},due_date.lte.${dateTo}),and(effective_payment_date.gte.${dateFrom},effective_payment_date.lte.${dateTo})`)
      .order("due_date");

    if (companyId) query = query.eq("company_id", companyId);
    if (bankAccountId) query = query.eq("paying_bank_account_id", bankAccountId);
    if (statusFiltro === "pago") query = query.eq("status", "pago");
    if (statusFiltro === "provisionado") query = query.neq("status", "pago");

    const { data } = await query;
    const rows = data ?? [];

    const header = [
      "Data",
      "Empresa",
      "Banco",
      "Fornecedor",
      "Descrição",
      "Valor",
      "Categoria",
      "Centro de custos",
      "Tipo de custo",
      "Fixo/Variável",
      "Status",
    ];

    const csvLines = [
      header.join(";"),
      ...rows.map((r: any) => {
        const isPago = r.status === "pago";
        const data = isPago ? r.effective_payment_date ?? r.due_date : r.due_date;
        const valor = isPago ? r.paid_amount ?? r.gross_amount : r.gross_amount;
        const fixoVar = r.fixed_variable === "variavel" ? "Variável" : r.fixed_variable === "fixo" ? "Fixo" : "";

        return [
          data ? formatDateBR(data) : "",
          companyLabel(r.companies),
          r.bank_accounts?.nickname ?? r.bank_accounts?.bank_name ?? "",
          r.suppliers?.legal_name ?? "",
          r.description ?? "",
          formatNumberBR(valor),
          r.categories?.name ?? "",
          r.cost_centers?.name ?? "",
          COST_TYPE_LABELS[r.cost_type] ?? r.cost_type ?? "",
          fixoVar,
          isPago ? "Pago" : "Provisionado",
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";");
      }),
    ];

    // BOM para o Excel reconhecer UTF-8 e não quebrar os acentos
    const blob = new Blob(["﻿" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagamentos_${dateFrom}_a_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setCount(rows.length);
    setLoading(false);
  }

  const selectCls = "rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-ps-muted mb-1">De</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectCls + " w-full"} />
        </div>
        <div>
          <label className="block text-xs text-ps-muted mb-1">Até</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectCls + " w-full"} />
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
        <div>
          <label className="block text-xs text-ps-muted mb-1">Banco</label>
          <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={selectCls + " w-full"}>
            <option value="">Todos os bancos</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname ?? a.bank_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ps-muted mb-1">Status</label>
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className={selectCls + " w-full"}>
            <option value="todos">Pagos + Provisionados</option>
            <option value="pago">Somente pagos</option>
            <option value="provisionado">Somente provisionados</option>
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

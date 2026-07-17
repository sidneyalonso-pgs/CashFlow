"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { companyLabel } from "@/lib/format";

export function ExportPaymentsButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("payments")
      .select("description, gross_amount, paid_amount, due_date, status, companies(legal_name, trade_name), suppliers(legal_name)")
      .is("deleted_at", null);

    const rows = data ?? [];
    const header = ["Descrição", "Empresa", "Fornecedor", "Valor previsto", "Valor pago", "Vencimento", "Status"];
    const csvLines = [
      header.join(";"),
      ...rows.map((r: any) =>
        [
          r.description,
          companyLabel(r.companies),
          r.suppliers?.legal_name ?? "",
          r.gross_amount,
          r.paid_amount ?? "",
          r.due_date,
          r.status,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors disabled:opacity-60"
    >
      {loading ? "Gerando..." : "Exportar pagamentos (CSV)"}
    </button>
  );
}

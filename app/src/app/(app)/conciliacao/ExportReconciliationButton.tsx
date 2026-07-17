"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ExportReconciliationButton({ bankAccountId }: { bankAccountId?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("reconciliations")
      .select(
        "id, entity_type, entity_id, match_type, created_at, bank_statement_entries(entry_date, bank_description, amount, direction, bank_account_id)"
      );

    if (bankAccountId) {
      query = query.eq("bank_statement_entries.bank_account_id", bankAccountId);
    }

    const { data: reconciliations } = await query;
    const rows = reconciliations ?? [];

    const paymentIds = rows.filter((r: any) => r.entity_type === "payment").map((r: any) => r.entity_id);
    const revenueIds = rows.filter((r: any) => r.entity_type === "revenue").map((r: any) => r.entity_id);

    const [{ data: payments }, { data: revenues }] = await Promise.all([
      paymentIds.length
        ? supabase.from("payments").select("id, description, effective_payment_date, gross_amount, suppliers(legal_name)").in("id", paymentIds)
        : Promise.resolve({ data: [] as any[] }),
      revenueIds.length
        ? supabase.from("revenues").select("id, description, realized_date, realized_amount, categories(name)").in("id", revenueIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const paymentById = new Map((payments ?? []).map((p: any) => [p.id, p]));
    const revenueById = new Map((revenues ?? []).map((r: any) => [r.id, r]));

    const header = [
      "Fornecedor/Cliente",
      "Descrição interna",
      "Data do pagamento (sistema)",
      "Valor (sistema)",
      "Descrição do banco",
      "Data do extrato",
      "Valor do extrato",
      "Tipo de vínculo",
    ];

    const csvLines = [header.join(";")];

    for (const r of rows as any[]) {
      const entry = r.bank_statement_entries;
      const internal = r.entity_type === "payment" ? paymentById.get(r.entity_id) : revenueById.get(r.entity_id);
      const counterpart =
        r.entity_type === "payment" ? internal?.suppliers?.legal_name : internal?.categories?.name;
      const internalDate = r.entity_type === "payment" ? internal?.effective_payment_date : internal?.realized_date;
      const internalAmount = r.entity_type === "payment" ? internal?.gross_amount : internal?.realized_amount;

      csvLines.push(
        [
          counterpart ?? "",
          internal?.description ?? "",
          internalDate ?? "",
          internalAmount ?? "",
          entry?.bank_description ?? "",
          entry?.entry_date ?? "",
          entry?.amount ?? "",
          r.match_type,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conciliacao-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors disabled:opacity-60"
    >
      {loading ? "Gerando..." : "Exportar comparativo (CSV)"}
    </button>
  );
}

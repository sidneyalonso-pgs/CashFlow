"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ExportSuppliersButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("suppliers")
      .select("id, legal_name, default_description")
      .order("legal_name");

    const rows = data ?? [];
    const header = ["ID", "Razão social", "Descrição"];
    const csvLines = [
      header.join(";"),
      ...rows.map((s: any) =>
        [s.id, s.legal_name, s.default_description ?? ""]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      ),
    ];

    const blob = new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fornecedores-${new Date().toISOString().slice(0, 10)}.csv`;
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
      {loading ? "Gerando..." : "Exportar fornecedores (CSV)"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChartAccountRef = { codigo: string; descricao: string } | null;

export function ExportDeParaButton({ bankAccountId }: { bankAccountId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!bankAccountId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: bankAccount } = await supabase
      .from("bank_accounts")
      .select("nickname, bank_name, chart_of_accounts(codigo, descricao), companies(codigo_contabil)")
      .eq("id", bankAccountId)
      .single();

    if (!bankAccount) {
      setError("Conta bancária não encontrada.");
      setLoading(false);
      return;
    }

    const bankChartAccount: ChartAccountRef = (bankAccount as any).chart_of_accounts ?? null;
    const lote: string = (bankAccount as any).companies?.codigo_contabil ?? "";

    const { data: entries, error: fetchError } = await supabase
      .from("bank_statement_entries")
      .select(
        "id, entry_date, bank_description, amount, direction, bank_balance, reconciliations(entity_type, entity_id, payments(description, chart_of_accounts(codigo, descricao)), revenues(description, chart_of_accounts(codigo, descricao)))"
      )
      .eq("bank_account_id", bankAccountId)
      .eq("reconciliation_status", "conciliado_manualmente")
      .order("entry_date");

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const accountLabel = (a: ChartAccountRef) => (a ? `${a.codigo} - ${a.descricao}` : "");

    const header = ["Operação", "Lote", "Data", "Valor", "Débito", "D. Débito", "Crédito", "D. Crédito", "Histórico", "Saldo"];
    const csvLines = [header.join(";")];
    let skipped = 0;

    for (const entry of (entries ?? []) as any[]) {
      const rec = (entry.reconciliations ?? [])[0];
      if (!rec || (rec.entity_type !== "payment" && rec.entity_type !== "revenue")) {
        // vínculos com aplicação/resgate/transferência não têm conta contábil mapeada ainda
        skipped++;
        continue;
      }

      const isPagamento = rec.entity_type === "payment";
      const operacao = isPagamento ? "PAGTO" : "RECBTO";
      const entidade = isPagamento ? rec.payments : rec.revenues;
      const contaEntidade: ChartAccountRef = entidade?.chart_of_accounts ?? null;
      const debito = isPagamento ? contaEntidade : bankChartAccount;
      const credito = isPagamento ? bankChartAccount : contaEntidade;

      const descricaoBase = entidade?.description || entry.bank_description || "";
      const nomeConta = contaEntidade?.descricao ?? "";
      const historico = `VALOR REF. ${operacao} ${descricaoBase}${nomeConta ? ` - ${nomeConta}` : ""}`.toUpperCase();

      csvLines.push(
        [
          operacao,
          lote,
          formatDateBR(entry.entry_date),
          formatNumberBR(Math.abs(Number(entry.amount))),
          debito?.codigo ?? "",
          debito?.descricao ?? "",
          credito?.codigo ?? "",
          credito?.descricao ?? "",
          historico,
          entry.bank_balance != null ? formatNumberBR(Number(entry.bank_balance)) : "",
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(";")
      );
    }

    const blob = new Blob(["﻿" + csvLines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const acc = bankAccount as any;
    const contaLabel = (acc.nickname ?? acc.bank_name ?? "conta").replace(/\s+/g, "_");
    link.download = `De_Para_${contaLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (skipped > 0) {
      setError(`${skipped} lançamento(s) ignorado(s): vínculo com aplicação/resgate/transferência não tem conta contábil configurada.`);
    }
    setLoading(false);
  }

  if (!bankAccountId) return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors disabled:opacity-60"
      >
        {loading ? "Gerando..." : "Exportar De-Para Contábil (CSV)"}
      </button>
      {error && <span className="text-xs text-amber-700">{error}</span>}
    </div>
  );
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatNumberBR(v: number) {
  return v.toFixed(2).replace(".", ",");
}

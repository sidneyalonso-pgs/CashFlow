"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { parseBankStatementText, type StatementRow } from "@/lib/parsing/bankStatement";
import { formatBRL } from "@/lib/calculations/money";
import { importBankStatement } from "./actions";

export function ImportStatementWizard({
  companies,
  bankAccounts,
}: {
  companies: Array<{ id: string; legal_name: string }>;
  bankAccounts: Array<{ id: string; bank_name: string; nickname: string | null; company_id: string }>;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAccounts = bankAccounts.filter((a) => !companyId || a.company_id === companyId);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);

    let text: string;
    if (file.name.toLowerCase().endsWith(".csv")) {
      text = await file.text();
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      text = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
    }

    const parsed = parseBankStatementText(text);
    if (parsed.rows.length === 0) {
      setError("Não encontrei linhas de transação no arquivo. Confira se ele tem colunas de Data, Descrição e Valor.");
      return;
    }
    setRows(parsed.rows);
    setWarnings(parsed.warnings);
  }

  async function handleConfirm() {
    if (!companyId || !bankAccountId) {
      setError("Selecione empresa e conta bancária.");
      return;
    }
    setIsSubmitting(true);
    const res = await importBankStatement(rows, companyId, bankAccountId, fileName);
    setIsSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult({ imported: res.imported ?? 0, total: res.total ?? 0 });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-4">
        <h3 className="font-semibold text-ps-ink">1. Selecione empresa, conta e arquivo</h3>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setBankAccountId("");
            }}
            className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          >
            <option value="">Empresa...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legal_name}
              </option>
            ))}
          </select>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          >
            <option value="">Conta...</option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname ?? a.bank_name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-ps-muted">
          Aceita o extrato exportado direto do banco (CSV com colunas Data, Descrição, Valor e Saldo) ou uma
          planilha Excel no mesmo formato.
        </p>
        <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {warnings.length > 0 && !result && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-ps p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-2">
            Divergências de saldo encontradas ({warnings.length})
          </h4>
          <ul className="text-xs text-yellow-800 space-y-1 max-h-40 overflow-y-auto">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          <p className="text-xs text-yellow-700 mt-2">
            Isso pode indicar uma linha faltando no extrato — a importação continua normalmente, mas vale conferir.
          </p>
        </div>
      )}

      {rows.length > 0 && !result && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <h3 className="font-semibold text-ps-ink mb-3">
            2. Prévia ({rows.length} linha{rows.length === 1 ? "" : "s"})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ps-bg-2 text-ps-muted uppercase">
                <tr>
                  <th className="text-left px-2 py-2">Data</th>
                  <th className="text-left px-2 py-2">Descrição</th>
                  <th className="text-left px-2 py-2">Valor</th>
                  <th className="text-left px-2 py-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-ps-navy/5">
                    <td className="px-2 py-2 whitespace-nowrap">{row.date}</td>
                    <td className="px-2 py-2">{row.description}</td>
                    <td className={`px-2 py-2 whitespace-nowrap ${row.amount < 0 ? "text-red-600" : "text-ps-green-700"}`}>
                      {formatBRL(row.amount)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{row.balance !== null ? formatBRL(row.balance) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && <p className="text-xs text-ps-muted mt-2">Mostrando 10 de {rows.length} linhas.</p>}

          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="mt-4 bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
          >
            {isSubmitting ? "Importando..." : `Confirmar importação de ${rows.length} linha(s)`}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <p className="text-sm">
            <strong className="text-ps-green-700">{result.imported}</strong> de {result.total} linhas importadas.
          </p>
        </div>
      )}
    </div>
  );
}

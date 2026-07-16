"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { importBankStatement } from "./actions";

const EXPECTED_COLUMNS = ["data", "descricao", "valor", "documento"];

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
  const [rows, setRows] = useState<Record<string, any>[]>([]);
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

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });

    if (parsed.length === 0) {
      setError("A planilha está vazia.");
      return;
    }
    setRows(parsed);
  }

  async function handleConfirm() {
    if (!companyId || !bankAccountId) {
      setError("Selecione empresa e conta bancária.");
      return;
    }
    setIsSubmitting(true);
    const res = await importBankStatement(rows as any, companyId, bankAccountId, fileName);
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
          Colunas esperadas: <code className="font-mono text-xs">{EXPECTED_COLUMNS.join(", ")}</code> — valores
          negativos são tratados como saída, positivos como entrada.
        </p>
        <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {rows.length > 0 && !result && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <h3 className="font-semibold text-ps-ink mb-3">
            2. Prévia ({rows.length} linha{rows.length === 1 ? "" : "s"})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ps-bg-2 text-ps-muted uppercase">
                <tr>
                  {EXPECTED_COLUMNS.map((c) => (
                    <th key={c} className="text-left px-2 py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-ps-navy/5">
                    {EXPECTED_COLUMNS.map((c) => (
                      <td key={c} className="px-2 py-2 whitespace-nowrap">
                        {row[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

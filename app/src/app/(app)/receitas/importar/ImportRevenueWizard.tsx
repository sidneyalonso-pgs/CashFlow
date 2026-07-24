"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importRevenues } from "./actions";

const EXPECTED_COLUMNS = [
  "empresa_cnpj",
  "descricao",
  "categoria",
  "valor",
  "data_recebimento",
  "conta_recebedora",
  "observacoes",
];

type Result = Awaited<ReturnType<typeof importRevenues>>;

export function ImportRevenueWizard() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

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

  function handleConfirm() {
    startTransition(async () => {
      const res = await importRevenues(rows as any);
      setResult(res);
      if (res.created > 0) setRows([]);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-2">1. Selecione o arquivo</h3>
        <p className="text-sm text-ps-muted mb-1">
          Colunas esperadas: <code className="font-mono text-xs">{EXPECTED_COLUMNS.join(", ")}</code>
        </p>
        <p className="text-sm text-ps-muted mb-3">
          Campos obrigatórios: <code className="font-mono text-xs">empresa_cnpj, descricao, categoria, valor, data_recebimento</code>
          <br />
          <code className="font-mono text-xs">conta_recebedora</code> e <code className="font-mono text-xs">observacoes</code> são opcionais.
          <br />
          <code className="font-mono text-xs">data_recebimento</code> no formato <code className="font-mono text-xs">YYYY-MM-DD</code>.
          <br />
          <code className="font-mono text-xs">valor</code> em reais (ex: <code className="font-mono text-xs">1500.00</code>).
        </p>
        <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="text-sm" />
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
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
                    <th key={c} className="text-left px-2 py-2 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-ps-navy/5">
                    {EXPECTED_COLUMNS.map((c) => (
                      <td key={c} className="px-2 py-2 whitespace-nowrap">{row[c] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && <p className="text-xs text-ps-muted mt-2">Mostrando 10 de {rows.length} linhas.</p>}

          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="mt-4 bg-ps-green text-ps-navy-900 font-semibold rounded-ps-sm px-5 py-2 text-sm disabled:opacity-60"
          >
            {isPending ? "Importando..." : `Confirmar importação de ${rows.length} linha(s)`}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <h3 className="font-semibold text-ps-ink mb-3">3. Resultado</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-ps-muted uppercase">Total</p>
              <p className="text-xl font-bold">{result.total}</p>
            </div>
            <div>
              <p className="text-xs text-ps-muted uppercase">Criadas</p>
              <p className="text-xl font-bold text-ps-green-700">{result.created}</p>
            </div>
            <div>
              <p className="text-xs text-ps-muted uppercase">Com erro</p>
              <p className="text-xl font-bold text-red-600">{result.errors.length}</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <ul className="text-xs space-y-1 max-h-64 overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i} className="text-red-600">Linha {e.row} — {e.message}</li>
              ))}
            </ul>
          )}
          {result.created > 0 && (
            <a href="/receitas" className="mt-4 inline-block text-sm text-ps-navy underline">
              Ver receitas importadas →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

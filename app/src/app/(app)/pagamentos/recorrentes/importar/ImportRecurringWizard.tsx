"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importRecurringTemplates } from "./actions";

const EXPECTED_COLUMNS = [
  "empresa_cnpj",
  "fornecedor_documento",
  "descricao",
  "categoria",
  "centro_custo",
  "semana_do_mes",
  "dia_do_mes",
  "conta_pagadora",
];

type Result = Awaited<ReturnType<typeof importRecurringTemplates>>;

export function ImportRecurringWizard() {
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
      const res = await importRecurringTemplates(rows as any);
      setResult(res);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-2">1. Selecione o arquivo</h3>
        <p className="text-sm text-ps-muted mb-3">
          Colunas esperadas: <code className="font-mono text-xs">{EXPECTED_COLUMNS.join(", ")}</code>
          <br />
          Informe <code className="font-mono text-xs">semana_do_mes</code> (1 a 5) OU{" "}
          <code className="font-mono text-xs">dia_do_mes</code> (1 a 28) por linha — os demais campos
          (categoria, centro_custo, conta_pagadora) são opcionais.
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
                    <th key={c} className="text-left px-2 py-2 whitespace-nowrap">
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
              <p className="text-xs text-ps-muted uppercase">Criados</p>
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
                <li key={i} className="text-red-600">
                  Linha {e.row} — {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

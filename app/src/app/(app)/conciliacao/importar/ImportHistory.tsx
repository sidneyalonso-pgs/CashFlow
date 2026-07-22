"use client";

import { useState, useTransition } from "react";
import { deleteStatementImport } from "./actions";

type ImportRecord = {
  id: string;
  file_name: string;
  imported_rows: number | null;
  total_rows: number;
  created_at: string;
  bank_accounts: { bank_name: string; nickname: string | null } | null;
};

export function ImportHistory({ imports }: { imports: ImportRecord[] }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleDelete(importId: string) {
    if (!confirm("Excluir este extrato? As entradas pendentes serão removidas. Entradas já conciliadas não serão afetadas.")) return;
    startTransition(async () => {
      const res = await deleteStatementImport(importId);
      if (res.error) setErrors((prev) => ({ ...prev, [importId]: res.error! }));
    });
  }

  if (imports.length === 0) return null;

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h3 className="font-semibold text-ps-ink mb-3">Histórico de importações</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Arquivo</th>
              <th className="text-left px-3 py-2">Conta</th>
              <th className="text-left px-3 py-2">Linhas</th>
              <th className="text-left px-3 py-2">Data</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/30">
                <td className="px-3 py-2 text-ps-ink">{imp.file_name}</td>
                <td className="px-3 py-2 text-ps-muted">
                  {imp.bank_accounts?.nickname ?? imp.bank_accounts?.bank_name ?? "—"}
                </td>
                <td className="px-3 py-2 text-ps-muted">
                  {imp.imported_rows ?? imp.total_rows} de {imp.total_rows}
                </td>
                <td className="px-3 py-2 text-ps-muted whitespace-nowrap">
                  {new Date(imp.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-3 py-2 text-right">
                  {errors[imp.id] && <span className="text-xs text-red-500 mr-2">{errors[imp.id]}</span>}
                  <button
                    onClick={() => handleDelete(imp.id)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/calculations/money";

type PaymentRow = {
  id: string;
  amount: number;
  paid_at: string;
  paymentId: string;
  description: string;
  company: string;
  supplier: string;
};

export function PaymentsDetailTable({ rows }: { rows: PaymentRow[] }) {
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  const sorted = sortDir
    ? [...rows].sort((a, b) => sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount)
    : rows;

  function toggleSort() {
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  }

  const arrow = sortDir === "desc" ? " ↓" : sortDir === "asc" ? " ↑" : " ↕";

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3 whitespace-nowrap">Descrição</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">Empresa</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">Fornecedor</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">Data</th>
            <th
              className="text-left px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:text-ps-ink transition-colors"
              onClick={toggleSort}
            >
              Valor{arrow}
            </th>
            <th className="text-left px-4 py-3 whitespace-nowrap">% do total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const pct = total > 0 ? (r.amount / total) * 100 : 0;
            return (
              <tr key={r.id} className="border-t border-ps-navy/5 transition-colors hover:bg-ps-bg-2/60">
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link href={`/pagamentos/${r.paymentId}`} className="text-ps-ink hover:underline">
                    {r.description}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.company}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.supplier}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ps-muted">{r.paid_at}</td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-red-600 font-medium">
                  {formatBRL(r.amount)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-ps-navy/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums text-ps-muted text-xs w-10">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-ps-muted">
                Nenhum pagamento realizado neste período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

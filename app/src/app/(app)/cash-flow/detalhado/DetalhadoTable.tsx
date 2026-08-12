"use client";

import { Fragment, useState } from "react";
import { formatBRL } from "@/lib/calculations/money";

type Breakdown = { label: string; value: number };

export type DayRow = {
  day: string;
  saidas: number;
  provisaoSaidas: number;
  entradas: number;
  provisaoEntradas: number;
  investimento: number;
  saldo: number;
  saldoProjetado: number;
  saidasDetail: Breakdown[];
  provisaoSaidasDetail: Breakdown[];
  entradasDetail: Breakdown[];
  provisaoEntradasDetail: Breakdown[];
};

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function BreakdownList({ title, items, tone }: { title: string; items: Breakdown[]; tone: "red" | "amber" | "green" | "teal" }) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-700" : tone === "teal" ? "text-ps-navy/70" : "text-ps-green-700";
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ps-muted font-mono mb-1">{title}</p>
      <ul className="space-y-0.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-ps-ink">{it.label}</span>
            <span className={`tabular-nums font-medium ${toneClass}`}>{formatBRL(it.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DetalhadoTable({
  openingBalance,
  dateFrom,
  rows,
  blockedBalance,
}: {
  openingBalance: number;
  dateFrom: string;
  rows: DayRow[];
  blockedBalance: number;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (day: string) => setExpanded((prev) => ({ ...prev, [day]: !prev[day] }));

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">Dia</th>
            <th className="text-left px-4 py-3">Saídas</th>
            <th className="text-left px-4 py-3">Provisão de saídas</th>
            <th className="text-left px-4 py-3">Entradas</th>
            <th className="text-left px-4 py-3">Provisão de entradas</th>
            <th className="text-left px-4 py-3">Investimento</th>
            <th className="text-left px-4 py-3">Saldo da conta</th>
            <th className="text-left px-4 py-3">Saldo projetado</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-ps-navy/5 bg-ps-bg-2/40">
            <td className="px-4 py-3 font-medium text-ps-ink">Saldo inicial ({formatShort(dateFrom)})</td>
            <td className="px-4 py-3 text-ps-muted">—</td>
            <td className="px-4 py-3 text-ps-muted">—</td>
            <td className="px-4 py-3 text-ps-muted">—</td>
            <td className="px-4 py-3 text-ps-muted">—</td>
            <td className="px-4 py-3 text-ps-muted">—</td>
            <td className="px-4 py-3 tabular-nums font-semibold">{formatBRL(openingBalance)}</td>
            <td className="px-4 py-3 tabular-nums font-semibold text-ps-muted">
              {formatBRL(openingBalance - blockedBalance)}
            </td>
          </tr>
          {rows.map((row) => {
            const hasDetail =
              row.saidasDetail.length > 0 ||
              row.provisaoSaidasDetail.length > 0 ||
              row.entradasDetail.length > 0 ||
              row.provisaoEntradasDetail.length > 0;
            const isOpen = !!expanded[row.day];
            return (
              <Fragment key={row.day}>
                <tr
                  onClick={() => hasDetail && toggle(row.day)}
                  className={`border-t border-ps-navy/5 hover:bg-ps-bg-2/40 ${hasDetail ? "cursor-pointer" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {hasDetail && (
                        <span className={`inline-block text-ps-muted transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                      )}
                      {formatShort(row.day)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-red-600">
                    {row.saidas === 0 ? <span className="text-ps-muted">—</span> : formatBRL(row.saidas)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-amber-700">
                    {row.provisaoSaidas === 0 ? <span className="text-ps-muted">—</span> : formatBRL(row.provisaoSaidas)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ps-green-700">
                    {row.entradas === 0 ? <span className="text-ps-muted">—</span> : formatBRL(row.entradas)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ps-navy/70">
                    {row.provisaoEntradas === 0 ? <span className="text-ps-muted">—</span> : formatBRL(row.provisaoEntradas)}
                  </td>
                  <td
                    className={`px-4 py-3 tabular-nums ${
                      row.investimento < 0 ? "text-red-600" : row.investimento > 0 ? "text-ps-green-700" : "text-ps-muted"
                    }`}
                  >
                    {row.investimento === 0 ? "—" : formatBRL(row.investimento)}
                  </td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${row.saldo < 0 ? "text-red-600" : ""}`}>
                    {formatBRL(row.saldo)}
                  </td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${row.saldoProjetado < 0 ? "text-red-600" : "text-ps-muted"}`}>
                    {formatBRL(row.saldoProjetado)}
                  </td>
                </tr>
                {isOpen && hasDetail && (
                  <tr className="border-t border-ps-navy/5 bg-ps-bg-2/30">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <BreakdownList title="Saídas por fornecedor" items={row.saidasDetail} tone="red" />
                        <BreakdownList title="Provisão de saídas por fornecedor" items={row.provisaoSaidasDetail} tone="amber" />
                        <BreakdownList title="Entradas" items={row.entradasDetail} tone="green" />
                        <BreakdownList title="Provisão de entradas" items={row.provisaoEntradasDetail} tone="teal" />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

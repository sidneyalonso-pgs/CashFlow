"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/calculations/money";

export type ExpandableItem = { label: string; date: string; amount: number; href?: string };
export type ExpandableRow = { key: string; total: number; items: ExpandableItem[] };

function formatShort(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function ExpandableTable({
  rows,
  keyHeader,
  emptyMessage = "Nenhum registro encontrado.",
}: {
  rows: ExpandableRow[];
  keyHeader: string;
  emptyMessage?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
          <tr>
            <th className="text-left px-4 py-3">{keyHeader}</th>
            <th className="text-right px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = !!expanded[row.key];
            const hasItems = row.items.length > 0;
            return (
              <Fragment key={row.key}>
                <tr
                  onClick={() => hasItems && toggle(row.key)}
                  className={`border-t border-ps-navy/5 hover:bg-ps-bg-2/40 ${hasItems ? "cursor-pointer" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      {hasItems && (
                        <span className={`inline-block text-ps-muted transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                      )}
                      {row.key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatBRL(row.total)}</td>
                </tr>
                {isOpen && hasItems && (
                  <tr className="border-t border-ps-navy/5 bg-ps-bg-2/30">
                    <td colSpan={2} className="px-4 py-3">
                      <ul className="space-y-1">
                        {row.items.map((it, idx) => (
                          <li key={`${it.label}-${idx}`} className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-3 min-w-0">
                              <span className="text-xs text-ps-muted whitespace-nowrap">{formatShort(it.date)}</span>
                              {it.href ? (
                                <Link href={it.href} className="text-ps-navy underline decoration-dotted hover:decoration-solid truncate">
                                  {it.label}
                                </Link>
                              ) : (
                                <span className="text-ps-ink truncate">{it.label}</span>
                              )}
                            </span>
                            <span className="tabular-nums font-medium text-ps-muted whitespace-nowrap">{formatBRL(it.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-8 text-center text-ps-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

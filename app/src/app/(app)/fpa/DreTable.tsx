"use client";

import { Fragment, useState, useTransition } from "react";
import { salvarPdd } from "./actions";
import type { Col, DreRow } from "./dreData";

const fmt = (v: number) =>
  Math.abs(v) < 0.005 ? "–" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cor = (v: number) => (v < -0.005 ? "text-red-700" : "");
const sep = "border-l border-ps-navy/[0.05]";

function PddInput({ companyId, col, valor }: { companyId: string; col: Col; valor: number }) {
  const [v, setV] = useState(valor ? String(Math.abs(valor)).replace(".", ",") : "");
  const [pend, start] = useTransition();
  return (
    <input
      value={v}
      disabled={pend}
      inputMode="decimal"
      placeholder="0,00"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v.replace(/\./g, "").replace(",", ".") || 0);
        if (Number.isNaN(n)) return;
        start(async () => {
          await salvarPdd(companyId, col.from, n);
        });
      }}
      className="w-28 rounded-ps-sm border border-ps-navy/15 px-2 py-0.5 text-right text-sm tabular-nums"
    />
  );
}

export function DreTable({ cols, rows, companyId, editaPdd }: { cols: Col[]; rows: DreRow[]; companyId: string; editaPdd: boolean }) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const acum = (vals: number[][]) => [0, 1].map((k) => vals.reduce((s, c) => s + c[k], 0));

  const celulas = (vals: number[][], pad: string) => (
    <>
      {vals.map((c, i) => (
        <Fragment key={i}>
          <td className={`px-3 ${pad} text-right tabular-nums whitespace-nowrap ${sep} ${cor(c[0])}`}>{fmt(c[0])}</td>
          <td className={`px-3 ${pad} text-right tabular-nums whitespace-nowrap ${cor(c[1])}`}>{fmt(c[1])}</td>
        </Fragment>
      ))}
      {(() => {
        const a = acum(vals);
        return (
          <>
            <td className={`px-3 ${pad} text-right tabular-nums whitespace-nowrap font-medium ${sep} ${cor(a[0])}`}>{fmt(a[0])}</td>
            <td className={`px-3 ${pad} text-right tabular-nums whitespace-nowrap font-medium ${cor(a[1])}`}>{fmt(a[1])}</td>
          </>
        );
      })()}
    </>
  );

  return (
    <div className="overflow-x-auto rounded-ps border border-ps-navy/[0.08] bg-white">
      <table className="text-sm min-w-full">
        <thead>
          <tr className="bg-ps-navy text-white">
            <th rowSpan={2} className="sticky left-0 z-10 bg-ps-navy px-3 py-2 text-left font-semibold min-w-[280px]">
              Descrição
            </th>
            {cols.map((c) => (
              <th key={c.key} colSpan={2} className="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-white/20">
                {c.label}
              </th>
            ))}
            <th colSpan={2} className="px-3 py-2 text-center font-semibold border-l border-white/20">
              TOTAL
            </th>
          </tr>
          <tr className="bg-ps-navy/90 text-white/80 text-xs">
            {[...cols.map((c) => c.key), "total"].map((k) => (
              <Fragment key={k}>
                <th className="px-3 py-1 text-right font-medium border-l border-white/20">Real</th>
                <th className="px-3 py-1 text-right font-medium">Proj.</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = r.kind === "total";
            const aberta = abertas[r.key];
            const pode = r.kind === "grupo" && (r.filhos?.length ?? 0) > 0;
            return (
              <Fragment key={r.key}>
                <tr className={total ? "bg-[#eef0f4] font-semibold" : "border-t border-ps-navy/[0.05]"}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 ${total ? "bg-[#eef0f4]" : "bg-white"}`}>
                    {pode ? (
                      <button type="button" onClick={() => setAbertas({ ...abertas, [r.key]: !aberta })} className="flex items-center gap-2 text-left">
                        <span className="text-ps-muted text-xs w-3">{aberta ? "▾" : "▸"}</span>
                        {r.label}
                      </button>
                    ) : (
                      <span className="pl-5">{r.label}</span>
                    )}
                  </td>
                  {r.kind === "manual" && editaPdd ? (
                    <>
                      {r.vals.map((c, i) => (
                        <Fragment key={i}>
                          <td className={`px-3 py-1 text-right ${sep}`}>
                            <PddInput companyId={companyId} col={cols[i]} valor={c[0]} />
                          </td>
                          <td className="px-3 py-1 text-right text-ps-muted">–</td>
                        </Fragment>
                      ))}
                      <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${sep} ${cor(acum(r.vals)[0])}`}>{fmt(acum(r.vals)[0])}</td>
                      <td className="px-3 py-1.5 text-right text-ps-muted">–</td>
                    </>
                  ) : (
                    celulas(r.vals, "py-1.5")
                  )}
                </tr>
                {pode &&
                  aberta &&
                  r.filhos!.map((f) => (
                    <tr key={r.key + f.label} className="text-ps-muted bg-[#fafbfc]">
                      <td className="sticky left-0 z-10 bg-[#fafbfc] px-3 py-1 pl-10">{f.label}</td>
                      {celulas(f.vals, "py-1")}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

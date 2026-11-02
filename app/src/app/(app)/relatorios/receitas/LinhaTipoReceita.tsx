"use client";

import { Fragment, useState } from "react";
import type { LinhaTipo } from "./dados";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const celula = (n: number) => (n === 0 ? "—" : brl(n));
const dataBR = (iso: string | null) =>
  !iso ? "—" : iso.length === 7 ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const td = "px-4 py-2.5 text-right tabular-nums whitespace-nowrap";

/** Linha de um tipo de receita; ao clicar, abre os lançamentos que a compõem (para conferir no fechamento). */
export function LinhaTipoReceita({ linha }: { linha: LinhaTipo }) {
  const [aberta, setAberta] = useState(false);
  const temItens = linha.itens.length > 0;

  return (
    <Fragment>
      <tr className="border-t border-ps-navy/5">
        <td className="px-4 py-2.5 font-medium text-ps-ink">
          {temItens ? (
            <button type="button" onClick={() => setAberta((v) => !v)} className="inline-flex items-center gap-2 text-left hover:underline">
              <span className="text-ps-muted text-xs w-3">{aberta ? "▾" : "▸"}</span>
              {linha.label}
              <span className="text-[11px] font-normal text-ps-muted">({linha.itens.length})</span>
            </button>
          ) : (
            <span className="pl-5">{linha.label}</span>
          )}
        </td>
        <td className={td}>{celula(linha.real)}</td>
        <td className={`${td} text-ps-muted`}>{celula(linha.projetado)}</td>
        <td className={`${td} font-semibold`}>{celula(linha.total)}</td>
      </tr>
      {aberta && (
        <tr className="bg-ps-bg-2/40">
          <td colSpan={4} className="px-4 py-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ps-muted">
                    <th className="text-left py-1 pr-4">Descrição</th>
                    <th className="text-left py-1 pr-4">Competência</th>
                    <th className="text-left py-1 pr-4">Caixa</th>
                    <th className="text-left py-1 pr-4">Status</th>
                    <th className="text-right py-1">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {linha.itens.map((i, idx) => (
                    <tr key={idx} className="border-t border-ps-navy/5">
                      <td className="py-1.5 pr-4 text-ps-ink">{i.descricao}</td>
                      <td className="py-1.5 pr-4 tabular-nums whitespace-nowrap">{dataBR(i.competencia)}</td>
                      <td className="py-1.5 pr-4 tabular-nums whitespace-nowrap">{dataBR(i.caixa)}</td>
                      <td className="py-1.5 pr-4 whitespace-nowrap">{i.status === "recebida" ? "Recebida" : "Projetada"}</td>
                      <td className="py-1.5 text-right tabular-nums whitespace-nowrap">{brl(i.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

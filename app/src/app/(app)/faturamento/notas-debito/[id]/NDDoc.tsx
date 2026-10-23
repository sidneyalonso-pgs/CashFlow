import { formatBRL } from "@/lib/calculations/money";

/**
 * Documento da nota de débito. É o mesmo componente na tela e na página de impressão
 * (/print/notas-debito/[id]), como a fatura: assim o PDF sai só com o documento, sem o menu do sistema.
 */
export function NotaDebitoDocument({ nd }: { nd: any }) {
  const itens: Array<{ desc: string; comp: string; val: number }> = Array.isArray(nd.itens) ? nd.itens : [];

  return (
    <div className="doc-navy bg-white p-10">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-ps-navy">
        <div>
          <div className="font-bold text-ps-navy text-xl">PagSmile</div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-black text-ps-navy tracking-tight uppercase">Nota de Débito</h1>
          {nd.numero_nd && (
            <p className="text-xs text-ps-muted mt-1">
              Nº <strong className="text-ps-ink">{nd.numero_nd}</strong>
            </p>
          )}
          <p className="text-xs text-ps-muted">Emissão: {nd.data_emissao}</p>
          {nd.vencimento && (
            <div className="mt-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded">
              Vencimento: {nd.vencimento}
            </div>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-2">Pagador (emitente)</p>
          <p className="font-bold text-ps-ink text-sm">{nd.pagador ?? "—"}</p>
          {nd.cnpj_pagador && <p className="text-xs text-ps-muted">{nd.cnpj_pagador}</p>}
          {nd.end_pagador && <p className="text-xs text-ps-muted mt-1">{nd.end_pagador}</p>}
        </div>
        <div>
          <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-2">Recebedor</p>
          <p className="font-bold text-ps-ink text-sm">{nd.recebedor ?? "—"}</p>
          {nd.cnpj_recebedor && <p className="text-xs text-ps-muted">{nd.cnpj_recebedor}</p>}
          {nd.end_recebedor && <p className="text-xs text-ps-muted mt-1">{nd.end_recebedor}</p>}
        </div>
        {nd.debitado && (
          <div>
            <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-2">Debitado</p>
            <p className="font-bold text-ps-ink text-sm">{nd.debitado}</p>
            {nd.cnpj_debitado && <p className="text-xs text-ps-muted">{nd.cnpj_debitado}</p>}
          </div>
        )}
      </div>

      {nd.ref && (
        <div className="mb-4 bg-ps-bg-2 rounded-ps-sm px-4 py-2 text-sm">
          <span className="text-ps-muted">Referência: </span>
          <span className="font-medium text-ps-ink">{nd.ref}</span>
        </div>
      )}

      {/* Items */}
      <table className="w-full border-collapse text-sm mb-6">
        <thead>
          <tr className="bg-ps-navy text-white">
            <th className="text-left px-4 py-3 text-xs font-bold">Descrição</th>
            <th className="text-left px-4 py-3 text-xs font-bold">Competência</th>
            <th className="text-right px-4 py-3 text-xs font-bold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it, i) => (
            <tr key={i} className="border-b border-ps-navy/5">
              <td className="px-4 py-3">{it.desc}</td>
              <td className="px-4 py-3 text-ps-muted">{it.comp || "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatBRL(it.val)}</td>
            </tr>
          ))}
          {itens.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center text-ps-muted text-xs">
                Sem itens detalhados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mb-6">
        <div className="bg-ps-navy text-white rounded px-5 py-3 flex justify-between gap-16 font-bold min-w-[280px]">
          <span>Total</span>
          <span className="text-ps-green tabular-nums text-lg">{formatBRL(nd.total)}</span>
        </div>
      </div>

      {nd.obs && (
        <div className="border-t-2 border-ps-navy/5 pt-4 text-xs text-ps-muted">
          <strong className="text-ps-ink">Observações:</strong> {nd.obs}
        </div>
      )}
    </div>
  );
}

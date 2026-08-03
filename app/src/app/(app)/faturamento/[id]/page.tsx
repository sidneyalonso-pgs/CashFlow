import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: inv } = await supabase
    .from("billing_invoices")
    .select("*, billing_clients(*), companies(legal_name, trade_name)")
    .eq("id", params.id)
    .single();

  if (!inv) notFound();

  const client = inv.billing_clients as any;
  const company = inv.companies as any;
  const compName = company?.trade_name || company?.legal_name || "—";

  const STATUS_CLS: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    pago: "bg-green-50 text-green-700",
    cancelado: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <PageHeader
        title={`Demonstrativo — ${client?.razao ?? "—"}`}
        subtitle={`Competência ${inv.competencia}`}
        actions={
          <div className="flex gap-2">
            <Link href="/faturamento/faturas" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
              ← Voltar
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* DEMONSTRATIVO — layout para impressão */}
          <div id="docContent" className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-8 print:shadow-none print:border-none">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-ps-navy">
              <div>
                <div className="font-bold text-ps-navy text-xl">PagSmile</div>
                <div className="text-xs text-ps-muted mt-1">{compName}</div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-ps-navy tracking-tight">DEMONSTRATIVO DE REPASSE</h1>
                <p className="text-xs text-ps-muted mt-1">Competência: <strong className="text-ps-ink">{inv.competencia}</strong></p>
                {inv.inicio && inv.fim && (
                  <p className="text-xs text-ps-muted">Período: {inv.inicio} a {inv.fim}</p>
                )}
                <div className="mt-2 bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-1.5 rounded">
                  Emissão: {inv.data_emissao}
                  {inv.data_vencimento && <span className="ml-2">| Vencimento: {inv.data_vencimento}</span>}
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-2">Emitente</p>
                <p className="font-bold text-ps-ink">{compName}</p>
              </div>
              <div>
                <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-2">Merchant</p>
                <p className="font-bold text-ps-ink">{client?.razao ?? "—"}</p>
                {client?.cnpj && <p className="text-xs text-ps-muted">{client.cnpj}</p>}
              </div>
            </div>

            {/* Breakdown */}
            <table className="w-full border-collapse text-sm mb-6">
              <thead>
                <tr className="bg-ps-navy text-white">
                  <th className="text-left px-4 py-3 text-xs font-bold">Descrição</th>
                  <th className="text-right px-4 py-3 text-xs font-bold">Qtd</th>
                  <th className="text-right px-4 py-3 text-xs font-bold">Valor unitário</th>
                  <th className="text-right px-4 py-3 text-xs font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.modelo === "transacao" && (
                  <>
                    {inv.qtd_in > 0 && (
                      <tr className="border-b border-ps-navy/5">
                        <td className="px-4 py-3">Fee PIX IN</td>
                        <td className="px-4 py-3 text-right tabular-nums">{inv.qtd_in}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{inv.qtd_in > 0 ? formatBRL(inv.fee_in / inv.qtd_in) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatBRL(inv.fee_in)}</td>
                      </tr>
                    )}
                    {inv.qtd_out > 0 && (
                      <tr className="border-b border-ps-navy/5">
                        <td className="px-4 py-3">Fee PIX OUT</td>
                        <td className="px-4 py-3 text-right tabular-nums">{inv.qtd_out}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{inv.qtd_out > 0 ? formatBRL(inv.fee_out / inv.qtd_out) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatBRL(inv.fee_out)}</td>
                      </tr>
                    )}
                  </>
                )}
                {inv.modelo === "mensalidade" && (
                  <tr className="border-b border-ps-navy/5">
                    <td className="px-4 py-3">Mensalidade {inv.faixa_mens ? `(${inv.faixa_mens})` : ""}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{inv.num_contas} contas</td>
                    <td className="px-4 py-3 text-right">—</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatBRL(inv.total_faturado)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="min-w-[280px] space-y-2">
                <div className="flex justify-between text-sm text-ps-muted">
                  <span>Subtotal</span><span className="tabular-nums">{formatBRL(inv.total_faturado)}</span>
                </div>
                {inv.desconto_val > 0 && (
                  <div className="flex justify-between text-sm text-ps-muted">
                    <span>Desconto ({inv.desconto_perc}%)</span><span className="tabular-nums text-amber-600">−{formatBRL(inv.desconto_val)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-ps-muted border-t border-ps-navy/5 pt-2">
                  <span>Repasse ao merchant</span><span className="tabular-nums text-red-600">−{formatBRL(inv.total_repasse)}</span>
                </div>
                <div className="bg-ps-navy text-white rounded px-4 py-3 flex justify-between font-bold">
                  <span>Total a receber (fee)</span>
                  <span className="text-ps-green tabular-nums text-lg">{formatBRL(inv.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end border-t-2 border-ps-navy/5 pt-5 text-xs text-ps-muted">
              <div>{inv.obs && <p><strong className="text-ps-ink">Observações:</strong> {inv.obs}</p>}</div>
              <div className="text-right">
                {inv.data_repasse && <p>Data de repasse: <strong className="text-ps-ink">{inv.data_repasse}</strong></p>}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Status da fatura</h3>
            <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${STATUS_CLS[inv.status] ?? ""}`}>
              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
            </div>
            {inv.data_pgto && <p className="text-xs text-ps-muted">Pago em: {inv.data_pgto}</p>}
            <div className="border-t border-ps-navy/5 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ps-muted">Fee (nossa receita)</span><span className="font-semibold text-ps-green-700 tabular-nums">{formatBRL(inv.total)}</span></div>
              <div className="flex justify-between"><span className="text-ps-muted">Repasse</span><span className="font-semibold text-red-600 tabular-nums">{formatBRL(inv.total_repasse)}</span></div>
            </div>
            <InvoiceActions invoiceId={inv.id} status={inv.status} />
          </div>

          {(inv.revenue_id || inv.payment_id) && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-2">
              <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Lançamentos criados</h3>
              {inv.revenue_id && (
                <Link href="/receitas" className="flex items-center gap-2 text-sm text-ps-navy hover:underline">
                  <span className="text-ps-green">●</span> Receita lançada
                </Link>
              )}
              {inv.payment_id && (
                <Link href="/pagamentos" className="flex items-center gap-2 text-sm text-ps-navy hover:underline">
                  <span className="text-red-400">●</span> Pagamento lançado
                </Link>
              )}
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="w-full bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors print:hidden"
          >
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

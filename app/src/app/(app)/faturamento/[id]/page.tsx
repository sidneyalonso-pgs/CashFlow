import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/calculations/money";
import { InvoiceActions } from "./InvoiceActions";
import { PrintButton } from "./PrintButton";

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtCompetencia(c: string | null) {
  if (!c) return "—";
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [y, m] = c.split("-");
  return `${months[parseInt(m) - 1]}/${y}`;
}

const STATUS_CLS: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700",
  pago: "bg-green-50 text-green-700",
  cancelado: "bg-red-50 text-red-700",
};

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: inv }, ] = await Promise.all([
    supabase
      .from("billing_invoices")
      .select("*, billing_clients(*, billing_subcontas(*))")
      .eq("id", params.id)
      .single(),
  ]);

  if (!inv) notFound();

  const client = inv.billing_clients as any;
  const isMensalidade = ["mensalidade", "mensalidade_intro"].includes(inv.modelo);
  const isBets = inv.modelo === "bets";

  // Subcontas: from subcontas_detalhe (historical) or from current billing_subcontas
  let subcontas: Array<{ razao: string; cnpj?: string; num_conta?: string }> = [];
  if (inv.subcontas_detalhe) {
    const raw = inv.subcontas_detalhe;
    if (Array.isArray(raw)) subcontas = raw;
    else if (typeof raw === "object" && raw.subcontas) subcontas = raw.subcontas;
  }
  if (!subcontas.length && client?.billing_subcontas?.length) {
    subcontas = client.billing_subcontas.filter((s: any) => s.status === "ativa");
  }

  const titleLabel = isMensalidade
    ? "DEMONSTRATIVO DE MENSALIDADE"
    : isBets
    ? "DEMONSTRATIVO BETS"
    : "DEMONSTRATIVO DE REPASSE";

  return (
    <div>
      {/* Toolbar — screen only */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link href="/faturamento/faturas" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
          ← Voltar
        </Link>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-sm font-semibold ${STATUS_CLS[inv.status] ?? ""}`}>
            {(inv.status ?? "").charAt(0).toUpperCase() + (inv.status ?? "").slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── DOCUMENTO ── */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-ps-sm border border-ps-navy/5 rounded-ps p-10 print:shadow-none print:border-none print:p-0 print:rounded-none">

            {/* ── CABEÇALHO ── */}
            <div className="flex justify-between items-start mb-6">
              {/* Logo */}
              <div className="w-16 h-16 relative shrink-0">
                <Image
                  src="/logos/pagsmile-logo-navy.png"
                  alt="PagSmile IP"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Título + datas */}
              <div className="text-right">
                <h1 className="text-xl font-black text-ps-navy tracking-tight uppercase">{titleLabel}</h1>
                <p className="text-xs text-ps-muted mt-1">Emissão: <strong className="text-ps-ink">{fmtDate(inv.data_emissao)}</strong></p>
                <p className="text-xs text-ps-muted">Competência: <strong className="text-ps-ink">{fmtCompetencia(inv.competencia)}</strong></p>
                {(inv.inicio || inv.fim) && (
                  <div className="mt-2 border border-ps-navy/20 rounded px-3 py-1.5 text-right">
                    <p className="text-[10px] text-ps-muted uppercase tracking-wide font-semibold">Período</p>
                    <p className="text-xs font-bold text-ps-navy">{fmtDate(inv.inicio)} a {fmtDate(inv.fim)}</p>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-ps-navy/10 mb-5" />

            {/* ── RAZÃO SOCIAL ── */}
            <div className="mb-5">
              <p className="text-[10px] text-ps-muted uppercase tracking-widest font-semibold mb-1">Razão Social</p>
              <p className="font-bold text-ps-ink text-base">{client?.razao ?? "—"}</p>
              {client?.cnpj && <p className="text-xs text-ps-muted">CNPJ: {client.cnpj}</p>}
              {(client?.agencia || client?.num_conta) && (
                <p className="text-xs text-ps-muted">
                  {client.agencia ? `Ag. ${client.agencia}` : ""}
                  {client.agencia && client.num_conta ? " | " : ""}
                  {client.num_conta ? `CC ${client.num_conta}` : ""}
                </p>
              )}
            </div>

            {/* ── BARRA COMPETÊNCIA / PERÍODO / PGTO ── */}
            <div className="bg-ps-navy text-white grid grid-cols-3 rounded-t text-xs font-semibold mb-0">
              <div className="px-4 py-3">
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Competência</p>
                <p className="font-bold mt-0.5">{fmtCompetencia(inv.competencia)}</p>
              </div>
              <div className="px-4 py-3 border-l border-white/10">
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Período</p>
                <p className="font-bold mt-0.5 text-ps-green">
                  {inv.inicio && inv.fim ? `${fmtDate(inv.inicio)} a ${fmtDate(inv.fim)}` : "—"}
                </p>
              </div>
              <div className="px-4 py-3 border-l border-white/10">
                <p className="text-white/60 uppercase tracking-wide text-[10px]">Data de Pagamento</p>
                <p className="font-bold mt-0.5">{fmtDate(inv.data_pgto ?? inv.data_baixa)}</p>
              </div>
            </div>

            {/* ── TABELA SUBCONTAS (mensalidade) ── */}
            {isMensalidade && (
              <table className="w-full border-collapse text-sm mb-0">
                <thead>
                  <tr className="bg-ps-navy/90 text-white text-xs">
                    <th className="text-left px-4 py-2.5 font-semibold">Subconta</th>
                    <th className="text-left px-4 py-2.5 font-semibold">CNPJ</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Nº Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {subcontas.length > 0 ? subcontas.map((s, i) => (
                    <tr key={i} className="border-b border-ps-navy/5">
                      <td className="px-4 py-2.5 text-ps-ink text-xs">{s.razao ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ps-muted text-xs">{(s as any).cnpj ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ps-muted text-xs">{(s as any).num_conta ?? (s as any).numConta ?? "—"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-ps-muted text-xs">Nenhuma subconta registrada para este período.</td>
                    </tr>
                  )}
                  {/* Total row */}
                  <tr className="border-t-2 border-ps-navy/10">
                    <td colSpan={2} className="px-4 py-3 font-semibold text-ps-ink text-xs">Total de Subcontas Ativas</td>
                    <td className="px-4 py-3 font-bold text-ps-ink text-xs text-right">{subcontas.length > 0 ? `${subcontas.length} contas` : `${inv.num_contas ?? 0} contas`}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ── TABELA TRANSAÇÃO / BETS ── */}
            {!isMensalidade && (
              <table className="w-full border-collapse text-sm mb-0">
                <thead>
                  <tr className="bg-ps-navy/90 text-white text-xs">
                    <th className="text-left px-4 py-2.5 font-semibold">Descrição</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Qtd</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Valor unitário</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.qtd_in > 0 && (
                    <tr className="border-b border-ps-navy/5">
                      <td className="px-4 py-2.5 text-xs">PIX IN</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">{inv.qtd_in}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">{formatBRL(inv.qtd_in > 0 ? inv.fee_in / inv.qtd_in : 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-xs">{formatBRL(inv.fee_in)}</td>
                    </tr>
                  )}
                  {inv.qtd_out > 0 && (
                    <tr className="border-b border-ps-navy/5">
                      <td className="px-4 py-2.5 text-xs">PIX OUT</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">{inv.qtd_out}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">{formatBRL(inv.qtd_out > 0 ? inv.fee_out / inv.qtd_out : 0)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-xs">{formatBRL(inv.fee_out)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── TOTAIS ── */}
            <div className="mt-5 flex justify-end">
              <div className="min-w-[300px] space-y-2">
                {isMensalidade && (
                  <div className="flex justify-between text-sm text-ps-muted">
                    <span>Mensalidade {inv.faixa_mens ? `— ${inv.faixa_mens}` : ""}</span>
                    <span className="tabular-nums">{formatBRL(inv.total_faturado)}</span>
                  </div>
                )}
                {!isMensalidade && (
                  <div className="flex justify-between text-sm text-ps-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatBRL(inv.total_faturado)}</span>
                  </div>
                )}
                {Number(inv.desconto_val) > 0 && (
                  <div className="flex justify-between text-sm text-ps-muted">
                    <span>Desconto ({inv.desconto_perc}%)</span>
                    <span className="tabular-nums text-amber-600">−{formatBRL(inv.desconto_val)}</span>
                  </div>
                )}
                {Number(inv.total_repasse) > 0 && (
                  <div className="flex justify-between text-sm text-ps-muted">
                    <span>Repasse ao merchant</span>
                    <span className="tabular-nums text-red-600">−{formatBRL(inv.total_repasse)}</span>
                  </div>
                )}
                {/* Total box */}
                <div className="bg-ps-navy text-white rounded px-5 py-3.5 flex justify-between items-center font-bold mt-2">
                  <span className="text-sm uppercase tracking-wide">Total a receber</span>
                  <span className="text-ps-green tabular-nums text-xl">{formatBRL(inv.total)}</span>
                </div>
              </div>
            </div>

            {/* ── RODAPÉ ── */}
            <div className="mt-6 pt-4 border-t border-ps-navy/10 flex justify-between items-end text-xs text-ps-muted">
              <div>
                {inv.obs && (
                  <>
                    <p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Observações</p>
                    <p>{inv.obs}</p>
                  </>
                )}
              </div>
              {(inv.data_pgto || inv.data_baixa) && (
                <div className="text-right">
                  <p className="font-semibold text-ps-ink uppercase tracking-wide text-[10px] mb-1">Data de Pagamento</p>
                  <p className="font-bold text-ps-ink text-sm">{fmtDate(inv.data_pgto ?? inv.data_baixa)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR (screen only) ── */}
        <div className="space-y-4 print:hidden">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Status</h3>
            <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${STATUS_CLS[inv.status] ?? ""}`}>
              {(inv.status ?? "").charAt(0).toUpperCase() + (inv.status ?? "").slice(1)}
            </div>
            {inv.data_pgto && <p className="text-xs text-ps-muted">Pago em: {fmtDate(inv.data_pgto)}</p>}
            <div className="border-t border-ps-navy/5 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ps-muted">Fee (receita)</span>
                <span className="font-semibold text-ps-green-700 tabular-nums">{formatBRL(inv.total)}</span>
              </div>
              {Number(inv.total_repasse) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ps-muted">Repasse</span>
                  <span className="font-semibold text-red-600 tabular-nums">{formatBRL(inv.total_repasse)}</span>
                </div>
              )}
              {subcontas.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-ps-muted">Subcontas ativas</span>
                  <span className="font-semibold text-ps-ink">{subcontas.length}</span>
                </div>
              )}
            </div>
            <InvoiceActions invoiceId={inv.id} status={inv.status} />
          </div>

          {(inv.revenue_id || inv.payment_id) && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-2">
              <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Lançamentos</h3>
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

          <PrintButton />
        </div>
      </div>
    </div>
  );
}

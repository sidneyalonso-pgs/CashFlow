import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  "a_receber": { label: "A Receber", cls: "bg-blue-50 text-blue-700" },
  "recebido":  { label: "Recebido",  cls: "bg-green-50 text-green-700" },
  "pendente":  { label: "Pendente",  cls: "bg-amber-50 text-amber-700" },
  "pago":      { label: "Pago",      cls: "bg-green-50 text-green-700" },
  "cancelado": { label: "Cancelado", cls: "bg-red-50 text-red-700" },
};

function getStatusKey(status: string, totalRepasse: number): string {
  if (status === "cancelado") return "cancelado";
  if (Number(totalRepasse) === 0) return status === "pago" ? "recebido" : "a_receber";
  return status;
}

export default async function FaturasPage({ searchParams }: { searchParams: { mes?: string; status?: string; client_id?: string } }) {
  const supabase = createClient();

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from("billing_invoices")
      .select("id, competencia, status, total, total_faturado, total_repasse, data_emissao, data_pgto, data_vencimento, billing_clients(id, razao)")
      .order("created_at", { ascending: false }),
    supabase.from("billing_clients").select("id, razao").eq("status", "ativo").order("razao"),
  ]);

  let rows = invoices ?? [];
  if (searchParams.mes) rows = rows.filter((r: any) => r.competencia === searchParams.mes);
  if (searchParams.status) rows = rows.filter((r: any) => r.status === searchParams.status);
  if (searchParams.client_id) rows = rows.filter((r: any) => (r.billing_clients as any)?.id === searchParams.client_id);

  // Modelos sem repasse: mensalidade e bet — PagSmile retém o total inteiro
  function psValues(r: any) {
    const noRepasse = ["mensalidade", "mensalidade_intro", "bet", "bets"].includes(r.modelo);
    const ps = noRepasse ? Number(r.total) : Number(r.total_faturado) - Number(r.total_repasse);
    const parceiro = noRepasse ? 0 : Number(r.total_repasse);
    return { ps, parceiro };
  }

  const totalFee = rows.reduce((s: number, r: any) => s + psValues(r).ps, 0);
  const totalRepasse = rows.reduce((s: number, r: any) => s + psValues(r).parceiro, 0);

  return (
    <div>
      <PageHeader title="Faturas emitidas" subtitle="Histórico de todos os demonstrativos" actions={
        <Link href="/faturamento/emitir" className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors">
          Emitir demonstrativo
        </Link>
      } />

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-4">
        <input type="month" name="mes" defaultValue={searchParams.mes ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white" />
        <select name="client_id" defaultValue={searchParams.client_id ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todos os merchants</option>
          {(clients ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.razao}</option>)}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <Link href="/faturamento/faturas" className="text-sm text-ps-muted underline self-center">Limpar</Link>
      </AutoSubmitForm>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-ps-green px-5 py-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide">PagSmile — a receber (filtro)</p>
          <p className="text-xl font-bold text-ps-ink tabular-nums">{formatBRL(totalFee)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-red-400 px-5 py-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide">Parceiro — repasse (filtro)</p>
          <p className="text-xl font-bold text-ps-ink tabular-nums">{formatBRL(totalRepasse)}</p>
        </div>
      </div>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Merchant</th>
              <th className="text-left px-4 py-3">Competência</th>
              <th className="text-left px-4 py-3">Emissão</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="text-right px-4 py-3">PagSmile</th>
              <th className="text-right px-4 py-3">Parceiro</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/50">
                <td className="px-4 py-3 font-medium text-ps-ink">{(r.billing_clients as any)?.razao ?? "—"}</td>
                <td className="px-4 py-3 text-ps-muted">{r.competencia}</td>
                <td className="px-4 py-3 text-ps-muted">{r.data_emissao}</td>
                <td className="px-4 py-3 text-ps-muted">{r.data_vencimento ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ps-green-700 font-medium">{formatBRL(psValues(r).ps)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatBRL(psValues(r).parceiro)}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const sk = getStatusKey(r.status, psValues(r).parceiro);
                    const sd = STATUS_DISPLAY[sk];
                    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${sd?.cls ?? ""}`}>{sd?.label ?? r.status}</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/faturamento/${r.id}`} className="text-xs text-ps-navy underline">Ver / Baixar</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ps-muted">Nenhuma fatura encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

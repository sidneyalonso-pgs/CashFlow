import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";

const TIPO_LABEL: Record<string, string> = {
  reembolso: "Reembolso",
  rateio: "Rateio",
};

// Empresas do grupo PagSmile
const GRUPO = ["pagsmile", "paghub"];

function ndDirection(pagador: string, recebedor: string): "pagar" | "receber" | "interno" {
  const pagIsGroup = GRUPO.some(g => (pagador ?? "").toLowerCase().includes(g));
  const recIsGroup = GRUPO.some(g => (recebedor ?? "").toLowerCase().includes(g));
  if (pagIsGroup && !recIsGroup) return "pagar";
  if (!pagIsGroup && recIsGroup) return "receber";
  return "interno";
}

function ndStatusDisplay(status: string, dir: "pagar" | "receber" | "interno"): { label: string; cls: string } {
  if (status === "Cancelado") return { label: "Cancelado", cls: "bg-red-50 text-red-700" };
  if (dir === "pagar") {
    return status === "Pago"
      ? { label: "Pago", cls: "bg-green-50 text-green-700" }
      : { label: "A Pagar", cls: "bg-amber-50 text-amber-700" };
  }
  if (dir === "receber") {
    return status === "Pago"
      ? { label: "Recebido", cls: "bg-green-50 text-green-700" }
      : { label: "A Receber", cls: "bg-blue-50 text-blue-700" };
  }
  // interno
  return status === "Pago"
    ? { label: "Pago", cls: "bg-green-50 text-green-700" }
    : { label: "Pendente", cls: "bg-amber-50 text-amber-700" };
}

export default async function NotasDebitoPage({
  searchParams,
}: {
  searchParams: { status?: string; tipo?: string; competencia?: string };
}) {
  const supabase = createClient();
  const { data: notes } = await supabase
    .from("billing_debit_notes")
    .select("*")
    .order("created_at", { ascending: false });

  let rows = notes ?? [];
  if (searchParams.status) rows = rows.filter((r: any) => r.status === searchParams.status);
  if (searchParams.tipo) rows = rows.filter((r: any) => r.tipo === searchParams.tipo);
  if (searchParams.competencia) rows = rows.filter((r: any) => r.competencia === searchParams.competencia);

  const total = rows.reduce((s: number, r: any) => s + Number(r.total), 0);
  const pendente = rows.filter((r: any) => r.status === "Pendente").reduce((s: number, r: any) => s + Number(r.total), 0);

  return (
    <div>
      <PageHeader
        title="Notas de Débito"
        subtitle="Reembolsos e rateios entre empresas"
        actions={
          <Link
            href="/faturamento/notas-debito/nova"
            className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
          >
            Nova nota de débito
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-ps-green px-5 py-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide">Total (filtro)</p>
          <p className="text-xl font-bold text-ps-ink tabular-nums">{formatBRL(total)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-amber-400 px-5 py-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide">Pendente</p>
          <p className="text-xl font-bold text-ps-ink tabular-nums">{formatBRL(pendente)}</p>
        </div>
      </div>

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-4">
        <input
          type="month"
          name="competencia"
          defaultValue={searchParams.competencia ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        />
        <select name="tipo" defaultValue={searchParams.tipo ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todos os tipos</option>
          <option value="reembolso">Reembolso</option>
          <option value="rateio">Rateio</option>
        </select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todos os status</option>
          <option value="Pendente">Pendente</option>
          <option value="Pago">Pago</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <Link href="/faturamento/notas-debito" className="text-sm text-ps-muted underline self-center">Limpar</Link>
      </AutoSubmitForm>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Nº</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Pagador</th>
              <th className="text-left px-4 py-3">Recebedor</th>
              <th className="text-left px-4 py-3">Competência</th>
              <th className="text-left px-4 py-3">Vencimento</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/50">
                <td className="px-4 py-3 font-mono text-xs text-ps-muted">{r.numero_nd ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                    {TIPO_LABEL[r.tipo] ?? r.tipo ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-ps-ink">{r.pagador ?? "—"}</td>
                <td className="px-4 py-3 text-ps-muted">{r.recebedor ?? "—"}</td>
                <td className="px-4 py-3 text-ps-muted">{r.competencia ?? "—"}</td>
                <td className="px-4 py-3 text-ps-muted">{r.vencimento ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-ps-ink">{formatBRL(r.total)}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const dir = ndDirection(r.pagador, r.recebedor);
                    const sd = ndStatusDisplay(r.status, dir);
                    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${sd.cls}`}>{sd.label}</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/faturamento/notas-debito/${r.id}`} className="text-xs text-ps-navy underline">Ver</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-ps-muted">Nenhuma nota de débito encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

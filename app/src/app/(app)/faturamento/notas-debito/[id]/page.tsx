import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { NDActions } from "./NDActions";
import { NDPrintButton } from "./NDPrintButton";
import { NotaDebitoDocument } from "./NDDoc";

export default async function NotaDebitoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: nd } = await supabase
    .from("billing_debit_notes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!nd) notFound();


  const STATUS_CLS: Record<string, string> = {
    Pendente: "bg-amber-50 text-amber-700",
    Pago: "bg-green-50 text-green-700",
    Cancelado: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <PageHeader
        title={`Nota de Débito ${nd.numero_nd ?? ""}`}
        subtitle={`${nd.tipo === "reembolso" ? "Reembolso" : "Rateio"} — Competência ${nd.competencia ?? "—"}`}
        actions={
          <Link href="/faturamento/notas-debito" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
            ← Voltar
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Documento (o mesmo da página de impressão) */}
          <div className="rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden print:shadow-none print:border-none">
            <NotaDebitoDocument nd={nd} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 space-y-3">
            <h3 className="font-semibold text-ps-ink text-sm border-b border-ps-navy/5 pb-3">Status</h3>
            <div className={`inline-block px-3 py-1 rounded text-sm font-semibold ${STATUS_CLS[nd.status] ?? ""}`}>
              {nd.status}
            </div>
            {nd.data_pgto && <p className="text-xs text-ps-muted">Pago em: {nd.data_pgto}</p>}
            <div className="border-t border-ps-navy/5 pt-3">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-ps-muted">Total</span>
                <span className="text-ps-ink tabular-nums">{formatBRL(nd.total)}</span>
              </div>
            </div>
            <NDActions ndId={nd.id} status={nd.status} />
          </div>

          <NDPrintButton ndId={nd.id} />
        </div>
      </div>
    </div>
  );
}

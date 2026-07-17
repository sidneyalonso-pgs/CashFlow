import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";

export default async function CashFlowDetailPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string; company_id?: string; label?: string };
}) {
  const { start, end, company_id: companyId, label } = searchParams;

  if (!start || !end) {
    return (
      <div>
        <PageHeader title="Detalhe do período" subtitle="Período inválido" />
        <Link href="/cash-flow" className="text-sm text-ps-navy underline">
          Voltar ao Cash Flow
        </Link>
      </div>
    );
  }

  const supabase = createClient();

  let paymentsQuery = supabase
    .from("payment_realizations")
    .select("id, amount, paid_at, payments!inner(id, description, company_id, companies(legal_name), suppliers(legal_name))")
    .gte("paid_at", start)
    .lte("paid_at", end)
    .order("paid_at");

  let revenuesQuery = supabase
    .from("revenue_realizations")
    .select("id, amount, received_at, revenues!inner(id, description, company_id, companies(legal_name), categories(name))")
    .gte("received_at", start)
    .lte("received_at", end)
    .order("received_at");

  if (companyId) {
    paymentsQuery = paymentsQuery.eq("payments.company_id", companyId);
    revenuesQuery = revenuesQuery.eq("revenues.company_id", companyId);
  }

  const [{ data: paymentRealizations }, { data: revenueRealizations }] = await Promise.all([
    paymentsQuery,
    revenuesQuery,
  ]);

  return (
    <div>
      <PageHeader
        title={label ? `Detalhe — ${label}` : "Detalhe do período"}
        subtitle={`${formatShort(start)} a ${formatShort(end)}`}
        actions={
          <Link
            href="/cash-flow"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar ao Cash Flow
          </Link>
        }
      />

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Saídas (pagamentos realizados)</h3>
          <DataTable
            rows={paymentRealizations ?? []}
            rowKey={(r: any) => r.id}
            emptyMessage="Nenhum pagamento realizado neste período."
            columns={[
              {
                header: "Descrição",
                cell: (r: any) => (
                  <Link href={`/pagamentos/${r.payments?.id}`} className="text-ps-ink hover:underline">
                    {r.payments?.description}
                  </Link>
                ),
              },
              { header: "Empresa", cell: (r: any) => r.payments?.companies?.legal_name ?? "—" },
              { header: "Fornecedor", cell: (r: any) => r.payments?.suppliers?.legal_name ?? "—" },
              { header: "Data", cell: (r: any) => r.paid_at },
              { header: "Valor", cell: (r: any) => <span className="tabular-nums text-red-600">{formatBRL(r.amount)}</span> },
            ]}
          />
        </div>

        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Entradas (receitas recebidas)</h3>
          <DataTable
            rows={revenueRealizations ?? []}
            rowKey={(r: any) => r.id}
            emptyMessage="Nenhuma receita recebida neste período."
            columns={[
              { header: "Descrição", cell: (r: any) => r.revenues?.description },
              { header: "Empresa", cell: (r: any) => r.revenues?.companies?.legal_name ?? "—" },
              { header: "Categoria", cell: (r: any) => r.revenues?.categories?.name ?? "—" },
              { header: "Data", cell: (r: any) => r.received_at },
              { header: "Valor", cell: (r: any) => <span className="tabular-nums text-ps-green-700">{formatBRL(r.amount)}</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: { company_id?: string; from?: string; to?: string };
}) {
  const supabase = createClient();

  let payQuery = supabase
    .from("payments")
    .select(
      "id, description, gross_amount, paid_amount, due_date, effective_payment_date, status, reconciliation_status, companies(legal_name, trade_name), suppliers(legal_name), categories(name)"
    )
    .is("deleted_at", null)
    .order("due_date", { ascending: false });

  let invQuery = supabase
    .from("investments")
    .select("id, tipo, product, applied_amount, applied_date, companies(legal_name, trade_name), bank_accounts(bank_name, nickname)")
    .order("applied_date", { ascending: false });

  if (searchParams.company_id) {
    payQuery = payQuery.eq("company_id", searchParams.company_id);
    invQuery = invQuery.eq("company_id", searchParams.company_id);
  }
  if (searchParams.from) {
    payQuery = payQuery.gte("due_date", searchParams.from);
    invQuery = invQuery.gte("applied_date", searchParams.from);
  }
  if (searchParams.to) {
    payQuery = payQuery.lte("due_date", searchParams.to);
    invQuery = invQuery.lte("applied_date", searchParams.to);
  }

  const [{ data: movements }, { data: investments }, { data: companies }] = await Promise.all([
    payQuery,
    invQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Movimentações"
        subtitle="Consulta consolidada de pagamentos (saídas) previstos e realizados"
      />

      <form className="flex flex-wrap gap-3 mb-4">
        <select
          name="company_id"
          defaultValue={searchParams.company_id ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={searchParams.from ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm"
        />
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      {/* Pagamentos */}
      <DataTable
        rows={movements ?? []}
        rowKey={(m: any) => m.id}
        columns={[
          { header: "Empresa", cell: (m: any) => companyLabel(m.companies) },
          { header: "Fornecedor", cell: (m: any) => m.suppliers?.legal_name ?? "—" },
          {
            header: "Descrição",
            cell: (m: any) => (
              <Link href={`/pagamentos/${m.id}`} className="font-medium text-ps-ink hover:underline">
                {m.description}
              </Link>
            ),
          },
          { header: "Categoria", cell: (m: any) => m.categories?.name ?? "—" },
          { header: "Direção", cell: () => "Saída" },
          { header: "Vencimento", cell: (m: any) => m.due_date },
          {
            header: "Valor",
            cell: (m: any) => (
              <span className="tabular-nums">
                {m.paid_amount ? formatBRL(m.paid_amount) : formatBRL(m.gross_amount)}
              </span>
            ),
          },
          { header: "Status", cell: (m: any) => <StatusBadge status={m.status} /> },
          {
            header: "Conciliação",
            cell: (m: any) => {
              const s = m.reconciliation_status;
              if (s === "conciliado_manualmente" || s === "conciliado") return <span className="text-xs font-medium text-ps-green">Conciliado</span>;
              if (s === "pendente") return <span className="text-xs text-ps-muted">Pendente</span>;
              return <span className="text-xs text-ps-muted">—</span>;
            },
          },
        ]}
      />

      {/* Investimentos */}
      {(investments ?? []).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ps-ink mb-2">Investimentos</h3>
          <DataTable
            rows={investments ?? []}
            rowKey={(i: any) => `inv-${i.id}`}
            columns={[
              { header: "Empresa", cell: (i: any) => companyLabel(i.companies) },
              { header: "Conta", cell: (i: any) => i.bank_accounts?.nickname ?? i.bank_accounts?.bank_name ?? "—" },
              { header: "Produto", cell: (i: any) => <span className="font-medium">{i.product}</span> },
              {
                header: "Tipo",
                cell: (i: any) => (
                  <span className="text-xs text-ps-muted">
                    {i.tipo === "resgate" ? "Resgate" : "Aplicação"}
                  </span>
                ),
              },
              { header: "Data", cell: (i: any) => i.applied_date },
              {
                header: "Valor",
                cell: (i: any) => (
                  <span className="tabular-nums font-medium">
                    {formatBRL(i.applied_amount)}
                  </span>
                ),
              },
              { header: "Status", cell: () => <span className="text-xs text-ps-muted">—</span> },
              { header: "Conciliação", cell: () => <span className="text-xs text-ps-muted">—</span> },
            ]}
          />
        </div>
      )}
    </div>
  );
}

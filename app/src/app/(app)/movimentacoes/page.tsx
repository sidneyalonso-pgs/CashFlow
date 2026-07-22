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

  let query = supabase
    .from("payments")
    .select(
      "id, description, gross_amount, paid_amount, due_date, effective_payment_date, status, reconciliation_status, companies(legal_name, trade_name), suppliers(legal_name), categories(name)"
    )
    .is("deleted_at", null)
    .order("due_date", { ascending: false });

  if (searchParams.company_id) query = query.eq("company_id", searchParams.company_id);
  if (searchParams.from) query = query.gte("due_date", searchParams.from);
  if (searchParams.to) query = query.lte("due_date", searchParams.to);

  const [{ data: movements }, { data: companies }] = await Promise.all([
    query,
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
              if (s === "conciliado") return <span className="text-xs font-medium text-ps-green">Conciliado</span>;
              if (s === "pendente") return <span className="text-xs text-ps-muted">Pendente</span>;
              return <span className="text-xs text-ps-muted">—</span>;
            },
          },
        ]}
      />
    </div>
  );
}

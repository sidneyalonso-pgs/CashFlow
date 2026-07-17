import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { InlineDueDateEdit } from "./InlineDueDateEdit";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { company_id?: string; status?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("payments")
    .select("id, description, gross_amount, due_date, status, companies(legal_name), suppliers(legal_name)")
    .is("deleted_at", null)
    .order("due_date", { ascending: false });

  if (searchParams.company_id) query = query.eq("company_id", searchParams.company_id);
  if (searchParams.status) query = query.eq("status", searchParams.status);

  const [{ data: payments }, { data: companies }] = await Promise.all([
    query,
    supabase.from("companies").select("id, legal_name").order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Pagamentos"
        subtitle="Lance pagamentos avulsos ou gerencie os pagamentos recorrentes"
        actions={
          <div className="flex gap-2">
            <Link
              href="/pagamentos/recorrentes"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Pagamentos recorrentes
            </Link>
            <Link
              href="/pagamentos/novo"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              Lançar pagamento
            </Link>
          </div>
        }
      />

      <form className="flex gap-3 mb-4">
        <select
          name="company_id"
          defaultValue={searchParams.company_id ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.legal_name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos os status</option>
          {[
            { value: "rascunho", label: "Pendente (fixo aguardando valor)" },
            { value: "pago", label: "Pago" },
            { value: "cancelado", label: "Cancelado" },
          ].map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <DataTable
        rows={payments ?? []}
        rowKey={(p: any) => p.id}
        columns={[
          { header: "Empresa", cell: (p: any) => p.companies?.legal_name ?? "—" },
          { header: "Fornecedor", cell: (p: any) => p.suppliers?.legal_name ?? "—" },
          {
            header: "Descrição",
            cell: (p: any) => (
              <Link href={`/pagamentos/${p.id}`} className="font-medium text-ps-ink hover:underline">
                {p.description}
              </Link>
            ),
          },
          {
            header: "Vencimento",
            cell: (p: any) => <InlineDueDateEdit paymentId={p.id} dueDate={p.due_date} />,
          },
          {
            header: "Valor",
            cell: (p: any) => <span className="tabular-nums">{formatBRL(p.gross_amount)}</span>,
          },
          { header: "Status", cell: (p: any) => <StatusBadge status={p.status} /> },
        ]}
      />
    </div>
  );
}

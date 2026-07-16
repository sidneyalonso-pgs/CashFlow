import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { RevenueSettleButton } from "./RevenueSettleButton";

export default async function RevenuesPage() {
  const supabase = createClient();

  const [{ data: revenues }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("revenues")
      .select("id, description, expected_amount, realized_amount, expected_date, status, companies(legal_name), customers(name)")
      .is("deleted_at", null)
      .order("expected_date", { ascending: false }),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Receitas"
        subtitle="Receitas recebidas e estimativas futuras"
        actions={
          <Link
            href="/receitas/novo"
            className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
          >
            Nova receita
          </Link>
        }
      />

      <DataTable
        rows={revenues ?? []}
        rowKey={(r: any) => r.id}
        columns={[
          { header: "Descrição", cell: (r: any) => <span className="font-medium text-ps-ink">{r.description}</span> },
          { header: "Empresa", cell: (r: any) => r.companies?.legal_name ?? "—" },
          { header: "Cliente", cell: (r: any) => r.customers?.name ?? "—" },
          { header: "Data prevista", cell: (r: any) => r.expected_date },
          {
            header: "Valor",
            cell: (r: any) => (
              <span className="tabular-nums">{formatBRL(r.realized_amount ?? r.expected_amount)}</span>
            ),
          },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          {
            header: "Ações",
            cell: (r: any) =>
              ["estimada", "confirmada", "atrasada", "reprogramada"].includes(r.status) ? (
                <RevenueSettleButton revenueId={r.id} bankAccounts={bankAccounts ?? []} />
              ) : (
                "—"
              ),
          },
        ]}
      />
    </div>
  );
}

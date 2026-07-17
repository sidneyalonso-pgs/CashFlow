import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { RevenueSettleButton } from "./RevenueSettleButton";
import { EditRevenueButton } from "./EditRevenueButton";

export default async function RevenuesPage() {
  const supabase = createClient();

  const [{ data: revenues }, { data: bankAccounts }, { data: customers }, { data: categories }] = await Promise.all([
    supabase
      .from("revenues")
      .select(
        "id, description, customer_id, category_id, expected_amount, realized_amount, expected_date, status, notes, companies(legal_name), customers(name)"
      )
      .is("deleted_at", null)
      .order("expected_date", { ascending: false }),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
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
            cell: (r: any) => (
              <div className="flex gap-2">
                <EditRevenueButton revenue={r} customers={customers ?? []} categories={categories ?? []} />
                {["estimada", "confirmada", "atrasada", "reprogramada"].includes(r.status) && (
                  <RevenueSettleButton revenueId={r.id} bankAccounts={bankAccounts ?? []} />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

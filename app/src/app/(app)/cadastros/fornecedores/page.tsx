import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewSupplierButton } from "./NewSupplierButton";
import { EditSupplierButton } from "./EditSupplierButton";
import { ExportSuppliersButton } from "./ExportSuppliersButton";

const COST_TYPE_LABELS: Record<string, string> = {
  despesas: "Despesas",
  custo_direto: "Custo Direto",
  custo_indireto: "Custo Indireto",
};

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: categories }, { data: costCenters }, { data: companies }] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, legal_name, cost_type, default_category_id, default_cost_center_id, default_description, status, is_recurring, recurring_amount, recurring_day_of_month, categories(name), cost_centers(code, name)"
      )
      .order("legal_name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("cost_centers").select("id, code, name").order("code"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Razão social, classificação de custo e departamento"
        actions={
          <div className="flex gap-2">
            <ExportSuppliersButton />
            <NewSupplierButton categories={categories ?? []} costCenters={costCenters ?? []} />
          </div>
        }
      />

      <DataTable
        rows={suppliers ?? []}
        rowKey={(s: any) => s.id}
        columns={[
          { header: "Razão social", cell: (s: any) => (
            <span className="font-medium text-ps-ink">
              {s.legal_name}
              {s.is_recurring && (
                <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">recorrente</span>
              )}
            </span>
          )},
          { header: "Tipo de custo", cell: (s: any) => COST_TYPE_LABELS[s.cost_type] ?? s.cost_type },
          { header: "Categoria", cell: (s: any) => s.categories?.name ?? "—" },
          { header: "Departamento", cell: (s: any) => (s.cost_centers ? `${s.cost_centers.code} - ${s.cost_centers.name}` : "—") },
          { header: "Status", cell: (s: any) => <StatusBadge status={s.status} /> },
          {
            header: "Ações",
            cell: (s: any) => (
              <EditSupplierButton
                supplier={s}
                categories={categories ?? []}
                costCenters={costCenters ?? []}
                companies={companies ?? []}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

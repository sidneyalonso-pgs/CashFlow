import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { NewSupplierButton } from "./NewSupplierButton";
import { ExportSuppliersButton } from "./ExportSuppliersButton";
import { SuppliersTable } from "./SuppliersTable";

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: categories }, { data: costCenters }] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, legal_name, cost_type, default_category_id, default_cost_center_id, default_description, status, is_recurring, recurring_amount, recurring_day_of_month, categories(name), cost_centers(code, name)"
      )
      .order("legal_name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("cost_centers").select("id, code, name").order("code"),
  ]);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Edite categoria, departamento e descrição diretamente na tabela"
        actions={
          <div className="flex gap-2">
            <ExportSuppliersButton />
            <NewSupplierButton categories={categories ?? []} costCenters={costCenters ?? []} />
          </div>
        }
      />

      <SuppliersTable
        suppliers={(suppliers ?? []) as any}
        categories={categories ?? []}
        costCenters={costCenters ?? []}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewSupplierButton } from "./NewSupplierButton";
import { EditSupplierButton } from "./EditSupplierButton";

const COST_TYPE_LABELS: Record<string, string> = {
  despesas: "Despesas",
  custo_direto: "Custo Direto",
  custo_indireto: "Custo Indireto",
};

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: categories }, { data: costCentersRaw }] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, legal_name, tax_id, cost_type, default_category_id, default_cost_center_id, status, categories(name), cost_centers(code, name)"
      )
      .order("legal_name"),
    supabase
      .from("categories")
      .select("id, name")
      .in("name", ["G&A (Gerais e Administrativas)", "Despesas Operacionais"])
      .order("name"),
    supabase.from("cost_centers").select("id, code, name, companies(legal_name)").order("code"),
  ]);

  const costCenters = (costCentersRaw ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    company_name: c.companies?.legal_name ?? "",
  }));

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Razão social, documento, classificação de custo e departamento"
        actions={<NewSupplierButton categories={categories ?? []} costCenters={costCenters} />}
      />

      <DataTable
        rows={suppliers ?? []}
        rowKey={(s: any) => s.id}
        columns={[
          { header: "Razão social", cell: (s: any) => <span className="font-medium text-ps-ink">{s.legal_name}</span> },
          { header: "CPF/CNPJ", cell: (s: any) => <span className="font-mono text-xs text-ps-muted">{s.tax_id}</span> },
          { header: "Tipo de custo", cell: (s: any) => COST_TYPE_LABELS[s.cost_type] ?? s.cost_type },
          { header: "Categoria", cell: (s: any) => s.categories?.name ?? "—" },
          { header: "Departamento", cell: (s: any) => (s.cost_centers ? `${s.cost_centers.code} - ${s.cost_centers.name}` : "—") },
          { header: "Status", cell: (s: any) => <StatusBadge status={s.status} /> },
          {
            header: "Ações",
            cell: (s: any) => <EditSupplierButton supplier={s} categories={categories ?? []} costCenters={costCenters} />,
          },
        ]}
      />
    </div>
  );
}

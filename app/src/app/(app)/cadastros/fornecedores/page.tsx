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
  const [{ data: suppliers }, { data: categories }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, legal_name, tax_id, cost_type, default_category_id, status, categories(name)")
      .order("legal_name"),
    supabase
      .from("categories")
      .select("id, name")
      .in("name", ["G&A (Gerais e Administrativas)", "Despesas Operacionais"])
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Razão social, documento e classificação de custo"
        actions={<NewSupplierButton categories={categories ?? []} />}
      />

      <DataTable
        rows={suppliers ?? []}
        rowKey={(s: any) => s.id}
        columns={[
          { header: "Razão social", cell: (s: any) => <span className="font-medium text-ps-ink">{s.legal_name}</span> },
          { header: "CPF/CNPJ", cell: (s: any) => <span className="font-mono text-xs text-ps-muted">{s.tax_id}</span> },
          { header: "Tipo de custo", cell: (s: any) => COST_TYPE_LABELS[s.cost_type] ?? s.cost_type },
          { header: "Categoria", cell: (s: any) => s.categories?.name ?? "—" },
          { header: "Status", cell: (s: any) => <StatusBadge status={s.status} /> },
          {
            header: "Ações",
            cell: (s: any) => <EditSupplierButton supplier={s} categories={categories ?? []} />,
          },
        ]}
      />
    </div>
  );
}

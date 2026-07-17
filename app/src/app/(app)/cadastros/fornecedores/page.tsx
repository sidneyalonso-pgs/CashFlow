import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewSupplierButton } from "./NewSupplierButton";
import { EditSupplierButton } from "./EditSupplierButton";

export default async function SuppliersPage() {
  const supabase = createClient();
  const [{ data: suppliers }, { data: categories }, { data: costCenters }] = await Promise.all([
    supabase
      .from("suppliers")
      .select(
        "id, legal_name, trade_name, tax_id, person_type, email, phone, pix_key, default_category_id, default_cost_center_id, status"
      )
      .order("legal_name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("cost_centers").select("id, code, name").order("code"),
  ]);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro de fornecedores e prestadores de serviço"
        actions={<NewSupplierButton categories={categories ?? []} costCenters={costCenters ?? []} />}
      />

      <DataTable
        rows={suppliers ?? []}
        rowKey={(s) => s.id}
        columns={[
          { header: "Razão social", cell: (s) => <span className="font-medium text-ps-ink">{s.legal_name}</span> },
          { header: "Nome fantasia", cell: (s) => s.trade_name ?? "—" },
          { header: "CPF/CNPJ", cell: (s) => <span className="font-mono text-xs text-ps-muted">{s.tax_id}</span> },
          { header: "Tipo", cell: (s) => (s.person_type === "juridica" ? "Jurídica" : "Física") },
          { header: "E-mail", cell: (s) => s.email ?? "—" },
          { header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
          {
            header: "Ações",
            cell: (s) => (
              <EditSupplierButton supplier={s as any} categories={categories ?? []} costCenters={costCenters ?? []} />
            ),
          },
        ]}
      />
    </div>
  );
}

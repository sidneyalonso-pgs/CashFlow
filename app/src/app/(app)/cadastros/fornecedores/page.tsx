import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewSupplierButton } from "./NewSupplierButton";

export default async function SuppliersPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, legal_name, trade_name, tax_id, person_type, email, status")
    .order("legal_name");

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro de fornecedores e prestadores de serviço"
        actions={<NewSupplierButton />}
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
        ]}
      />
    </div>
  );
}

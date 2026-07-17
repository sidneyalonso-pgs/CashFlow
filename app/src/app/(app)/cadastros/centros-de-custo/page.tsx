import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewCostCenterButton } from "./NewCostCenterButton";
import { EditCostCenterButton } from "./EditCostCenterButton";

export default async function CostCentersPage() {
  const supabase = createClient();
  const [{ data: costCenters }, { data: companies }] = await Promise.all([
    supabase
      .from("cost_centers")
      .select("id, code, name, company_id, responsible_area, manager_name, status, companies(legal_name)")
      .order("code"),
    supabase.from("companies").select("id, legal_name").order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Centros de custo"
        subtitle="Estrutura de centros de custo por empresa"
        actions={<NewCostCenterButton companies={companies ?? []} />}
      />

      <DataTable
        rows={costCenters ?? []}
        rowKey={(c: any) => c.id}
        columns={[
          { header: "Código", cell: (c: any) => <span className="font-mono text-xs">{c.code}</span> },
          { header: "Nome", cell: (c: any) => <span className="font-medium text-ps-ink">{c.name}</span> },
          { header: "Empresa", cell: (c: any) => c.companies?.legal_name ?? "—" },
          { header: "Área", cell: (c: any) => c.responsible_area ?? "—" },
          { header: "Gestor", cell: (c: any) => c.manager_name ?? "—" },
          { header: "Status", cell: (c: any) => <StatusBadge status={c.status} /> },
          { header: "Ações", cell: (c: any) => <EditCostCenterButton costCenter={c} companies={companies ?? []} /> },
        ]}
      />
    </div>
  );
}

import { companyLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewProjectButton } from "./NewProjectButton";
import { EditProjectButton } from "./EditProjectButton";

export default async function ProjectsPage() {
  const supabase = createClient();
  const [{ data: projects }, { data: companies }, { data: costCenters }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, code, name, company_id, cost_center_id, responsible_name, start_date, end_date, status, companies(legal_name, trade_name)")
      .order("code"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("cost_centers").select("id, code, name").order("code"),
  ]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        subtitle="Projetos vinculados a empresas e centros de custo"
        actions={<NewProjectButton companies={companies ?? []} costCenters={costCenters ?? []} />}
      />

      <DataTable
        rows={projects ?? []}
        rowKey={(p: any) => p.id}
        columns={[
          { header: "Código", cell: (p: any) => <span className="font-mono text-xs">{p.code}</span> },
          { header: "Nome", cell: (p: any) => <span className="font-medium text-ps-ink">{p.name}</span> },
          { header: "Empresa", cell: (p: any) => companyLabel(p.companies) },
          { header: "Responsável", cell: (p: any) => p.responsible_name ?? "—" },
          { header: "Início", cell: (p: any) => p.start_date ?? "—" },
          { header: "Fim", cell: (p: any) => p.end_date ?? "—" },
          { header: "Status", cell: (p: any) => <StatusBadge status={p.status} /> },
          {
            header: "Ações",
            cell: (p: any) => (
              <EditProjectButton project={p} companies={companies ?? []} costCenters={costCenters ?? []} />
            ),
          },
        ]}
      />
    </div>
  );
}

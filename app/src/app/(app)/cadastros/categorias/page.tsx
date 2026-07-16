import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewCategoryButton } from "./NewCategoryButton";

const DIRECTION_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ambas: "Ambas",
};

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, allowed_direction, financial_nature, economic_classification, fpa_classification, status")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Classificação de entradas e saídas"
        actions={<NewCategoryButton />}
      />

      <DataTable
        rows={categories ?? []}
        rowKey={(c) => c.id}
        columns={[
          { header: "Nome", cell: (c) => <span className="font-medium text-ps-ink">{c.name}</span> },
          { header: "Direção", cell: (c) => DIRECTION_LABELS[c.allowed_direction] ?? c.allowed_direction },
          { header: "Natureza", cell: (c) => c.financial_nature ?? "—" },
          { header: "Classificação econômica", cell: (c) => c.economic_classification ?? "—" },
          { header: "FP&A", cell: (c) => c.fpa_classification ?? "—" },
          { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
        ]}
      />
    </div>
  );
}

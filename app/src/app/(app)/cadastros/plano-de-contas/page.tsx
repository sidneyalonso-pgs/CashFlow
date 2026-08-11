import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { NewChartAccountButton } from "./NewChartAccountButton";
import { EditChartAccountButton } from "./EditChartAccountButton";

export default async function ChartOfAccountsPage() {
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, codigo, descricao, status")
    .order("codigo");

  return (
    <div>
      <PageHeader
        title="Plano de contas"
        subtitle="Códigos contábeis usados no relatório De-Para Contábil"
        actions={<NewChartAccountButton />}
      />

      <DataTable
        rows={accounts ?? []}
        rowKey={(a) => a.id}
        columns={[
          { header: "Código", cell: (a) => <span className="font-mono text-sm">{a.codigo}</span> },
          { header: "Descrição", cell: (a) => <span className="font-medium text-ps-ink">{a.descricao}</span> },
          { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
          { header: "Ações", cell: (a) => <EditChartAccountButton account={a} /> },
        ]}
      />

      <p className="text-xs text-ps-muted mt-4">
        Vincule cada conta contábil a um fornecedor (Cadastros → Fornecedores), a uma conta
        bancária (Cadastros → Contas bancárias) ou a uma categoria de receita (Cadastros →
        Categorias). O relatório De-Para Contábil usa esses vínculos para resolver débito e
        crédito automaticamente.
      </p>
    </div>
  );
}

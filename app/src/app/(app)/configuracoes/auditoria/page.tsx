import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";

const ACTION_LABELS: Record<string, string> = {
  criacao: "Criação",
  edicao: "Edição",
  cancelamento: "Cancelamento",
  aprovacao: "Aprovação",
  rejeicao: "Rejeição",
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { entity_type?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.entity_type) query = query.eq("entity_type", searchParams.entity_type);

  const { data: logs } = await query;

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Últimos 200 eventos registrados no sistema" />

      <form className="flex gap-3 mb-4">
        <select
          name="entity_type"
          defaultValue={searchParams.entity_type ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as entidades</option>
          <option value="companies">Empresas</option>
          <option value="bank_accounts">Contas bancárias</option>
          <option value="suppliers">Fornecedores</option>
          <option value="payments">Pagamentos</option>
          <option value="payment_realizations">Baixas de pagamento</option>
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <DataTable
        rows={logs ?? []}
        rowKey={(l: any) => l.id}
        columns={[
          { header: "Data/hora", cell: (l: any) => new Date(l.created_at).toLocaleString("pt-BR") },
          { header: "Usuário", cell: (l: any) => l.profiles?.full_name ?? "—" },
          { header: "Ação", cell: (l: any) => ACTION_LABELS[l.action] ?? l.action },
          { header: "Entidade", cell: (l: any) => l.entity_type },
          { header: "ID do registro", cell: (l: any) => <span className="font-mono text-xs">{l.entity_id}</span> },
        ]}
      />
    </div>
  );
}

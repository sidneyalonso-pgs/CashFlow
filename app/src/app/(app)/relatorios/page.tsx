import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ExportPaymentsButton } from "./ExportPaymentsButton";

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .order("legal_name");

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportações gerenciais" />

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-1">Pagamentos</h3>
        <p className="text-sm text-ps-muted mb-5">
          Escolha o período e exporte em CSV com data, empresa, fornecedor, descrição, valor,
          categoria, centro de custos, tipo de custo, fixo/variável e status.
        </p>
        <ExportPaymentsButton companies={companies ?? []} />
      </div>

      <p className="text-xs text-ps-muted mt-4">
        O período filtra pela data de vencimento (provisionados) ou pela data efetiva de pagamento
        (pagos). Lançamentos cancelados e excluídos ficam de fora.
      </p>
    </div>
  );
}

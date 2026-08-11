import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ExportPaymentsButton } from "./ExportPaymentsButton";
import { ExportDeParaButton } from "./ExportDeParaButton";

export default async function ReportsPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, nickname, bank_name").order("bank_name"),
  ]);

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportações gerenciais" />

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-1">Pagamentos</h3>
        <p className="text-sm text-ps-muted mb-5">
          Escolha o período e exporte em CSV com data, empresa, banco, fornecedor, descrição, valor,
          categoria, centro de custos, tipo de custo, fixo/variável e status.
        </p>
        <ExportPaymentsButton companies={companies ?? []} bankAccounts={bankAccounts ?? []} />
      </div>

      <p className="text-xs text-ps-muted mt-4 mb-6">
        O período filtra pela data de vencimento (provisionados) ou pela data efetiva de pagamento
        (pagos). Lançamentos cancelados e excluídos ficam de fora.
      </p>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-1">De-Para Contábil</h3>
        <p className="text-sm text-ps-muted mb-5">
          Débito e crédito de cada pagamento e receita liquidados no mês, resolvidos a partir do
          Plano de Contas vinculado a fornecedores, contas bancárias e categorias.
        </p>
        <ExportDeParaButton companies={companies ?? []} />
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Considera apenas pagamentos pagos e receitas recebidas no mês selecionado. Lançamentos sem
        conta contábil vinculada aparecem com o campo de débito ou crédito em branco.
      </p>
    </div>
  );
}

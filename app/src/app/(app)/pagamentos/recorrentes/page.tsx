import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { NewTemplateButton } from "./NewTemplateButton";
import { EditTemplateButton } from "./EditTemplateButton";
import { TemplateActiveToggle } from "./TemplateActiveToggle";

export default async function RecurringPaymentsPage() {
  const supabase = createClient();

  const [{ data: templates }, { data: companies }, { data: suppliers }, { data: categories }, { data: costCenters }, { data: bankAccounts }] =
    await Promise.all([
      supabase
        .from("recurring_payment_templates")
        .select(
          "id, company_id, supplier_id, description, day_of_month, week_of_month, category_id, cost_center_id, paying_bank_account_id, active, companies(legal_name, trade_name), suppliers(legal_name)"
        )
        .order("day_of_month"),
      supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
      supabase.from("suppliers").select("id, legal_name").eq("status", "ativo").order("legal_name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("cost_centers").select("id, code, name").order("code"),
      supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
    ]);

  return (
    <div>
      <PageHeader
        title="Pagamentos recorrentes"
        subtitle="95% do volume — aluguel, assinaturas, folha — gerados automaticamente todo mês"
        actions={
          <div className="flex gap-2">
            <Link
              href="/pagamentos/baixa-em-massa"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Baixa em massa
            </Link>
            <Link
              href="/pagamentos/recorrentes/importar"
              className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
            >
              Importar em massa
            </Link>
            <NewTemplateButton
              companies={companies ?? []}
              suppliers={suppliers ?? []}
              categories={categories ?? []}
              costCenters={costCenters ?? []}
              bankAccounts={bankAccounts ?? []}
            />
          </div>
        }
      />

      <p className="text-sm text-ps-muted mb-4">
        Todo dia, o sistema verifica os pagamentos recorrentes ativos e gera um lançamento pendente em{" "}
        <strong>Pagamentos</strong> na semana ou no dia do mês configurado — sem valor, para você preencher e
        dar baixa (com a data exata) quando a fatura chegar.
      </p>

      <DataTable
        rows={templates ?? []}
        rowKey={(t: any) => t.id}
        columns={[
          { header: "Descrição", cell: (t: any) => <span className="font-medium text-ps-ink">{t.description}</span> },
          { header: "Empresa", cell: (t: any) => companyLabel(t.companies) },
          { header: "Fornecedor", cell: (t: any) => t.suppliers?.legal_name ?? "—" },
          {
            header: "Agendamento",
            cell: (t: any) => (t.week_of_month ? `Semana ${t.week_of_month}` : `Dia ${t.day_of_month}`),
          },
          { header: "Status", cell: (t: any) => <TemplateActiveToggle templateId={t.id} active={t.active} /> },
          {
            header: "Ações",
            cell: (t: any) => (
              <EditTemplateButton
                template={t}
                companies={companies ?? []}
                suppliers={suppliers ?? []}
                categories={categories ?? []}
                costCenters={costCenters ?? []}
                bankAccounts={bankAccounts ?? []}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

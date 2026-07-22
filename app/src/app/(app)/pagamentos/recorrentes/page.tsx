import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { NewTemplateButton } from "./NewTemplateButton";
import { EditTemplateButton } from "./EditTemplateButton";
import { TemplateActiveToggle } from "./TemplateActiveToggle";
import { RecurringSupplierPanel } from "./RecurringSupplierPanel";

export default async function RecurringPaymentsPage() {
  const supabase = createClient();

  const [
    { data: templates },
    { data: companies },
    { data: suppliers },
    { data: categories },
    { data: costCenters },
    { data: bankAccounts },
    { data: recurringSuppliers },
  ] = await Promise.all([
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
    supabase
      .from("suppliers")
      .select("id, legal_name, recurring_amount, recurring_day_of_month, default_description")
      .eq("status", "ativo")
      .eq("is_recurring", true)
      .order("legal_name"),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pagamentos recorrentes"
        subtitle="Gerencie templates automáticos e provisionamentos de fornecedores fixos"
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

      {/* Painel de fornecedores recorrentes */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1 h-5 rounded-full bg-blue-400 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-ps-ink">Provisionamento por fornecedor</h2>
            <p className="text-xs text-ps-muted">
              Fornecedores marcados como recorrentes em Cadastros. Gere os pagamentos futuros com um clique.
            </p>
          </div>
          <a href="/cadastros/fornecedores" className="ml-auto text-xs text-ps-navy underline">
            Gerenciar fornecedores →
          </a>
        </div>

        <RecurringSupplierPanel
          suppliers={recurringSuppliers ?? []}
          companies={companies ?? []}
        />
      </section>

      {/* Templates automáticos */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1 h-5 rounded-full bg-ps-green shrink-0" />
          <div>
            <h2 className="text-base font-bold text-ps-ink">Templates automáticos</h2>
            <p className="text-xs text-ps-muted">
              Gerados automaticamente todo mês sem valor — você preenche e dá baixa quando a fatura chegar.
            </p>
          </div>
        </div>

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
      </section>
    </div>
  );
}

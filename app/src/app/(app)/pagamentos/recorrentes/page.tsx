import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RecurringSupplierPanel } from "./RecurringSupplierPanel";

export default async function RecurringPaymentsPage() {
  const supabase = createClient();

  const [{ data: companies }, { data: recurringSuppliers }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase
      .from("suppliers")
      .select("id, legal_name, recurring_amount, recurring_week_of_month, default_description")
      .eq("status", "ativo")
      .eq("is_recurring", true)
      .order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Pagamentos recorrentes"
        subtitle="Provisione pagamentos futuros para todos os fornecedores recorrentes com um clique"
        actions={
          <a
            href="/cadastros/fornecedores"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Gerenciar fornecedores →
          </a>
        }
      />

      <RecurringSupplierPanel
        suppliers={recurringSuppliers ?? []}
        companies={companies ?? []}
      />
    </div>
  );
}

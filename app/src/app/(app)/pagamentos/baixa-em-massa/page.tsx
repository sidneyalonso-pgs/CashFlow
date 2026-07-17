import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { BulkSettleForm } from "./BulkSettleForm";
import { companyLabel } from "@/lib/format";

export default async function BulkSettlePage() {
  const supabase = createClient();

  const [{ data: payments }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, description, due_date, companies(legal_name, trade_name), suppliers(legal_name)")
      .eq("status", "rascunho")
      .is("deleted_at", null)
      .order("due_date"),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
  ]);

  const rows = (payments ?? []).map((p: any) => ({
    id: p.id,
    description: p.description,
    due_date: p.due_date,
    company_name: companyLabel(p.companies),
    supplier_name: p.suppliers?.legal_name ?? "—",
  }));

  return (
    <div>
      <PageHeader
        title="Baixa em massa"
        subtitle="Confirme valor e data dos pagamentos fixos gerados automaticamente"
      />
      <BulkSettleForm payments={rows} bankAccounts={bankAccounts ?? []} />
    </div>
  );
}

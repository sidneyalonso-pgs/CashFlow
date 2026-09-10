import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { BulkRevenueForm } from "./BulkRevenueForm";

export default async function BulkRevenuePage() {
  const supabase = createClient();
  const [{ data: companies }, { data: categories }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("bank_accounts").select("id, nickname, bank_name, company_id").order("nickname"),
  ]);

  return (
    <div>
      <PageHeader
        title="Lançar em massa"
        subtitle="Preencha várias linhas de receita de uma só vez e salve tudo junto"
      />
      <BulkRevenueForm
        companies={companies ?? []}
        categories={categories ?? []}
        bankAccounts={(bankAccounts ?? []).map((a: any) => ({ id: a.id, nickname: a.nickname, bank_name: a.bank_name, company_id: a.company_id }))}
      />
    </div>
  );
}

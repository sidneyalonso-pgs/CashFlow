import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RevenueForm } from "./RevenueForm";

export default async function NewRevenuePage() {
  const supabase = createClient();
  const [{ data: companies }, { data: categories }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("categories").select("id, name").in("allowed_direction", ["entrada", "ambas"]).order("name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
  ]);

  return (
    <div>
      <PageHeader title="Nova receita" subtitle="Lançamento de receita recebida ou estimada" />
      <RevenueForm companies={companies ?? []} categories={categories ?? []} bankAccounts={bankAccounts ?? []} />
    </div>
  );
}

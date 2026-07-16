import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RevenueForm } from "./RevenueForm";

export default async function NewRevenuePage() {
  const supabase = createClient();
  const [{ data: companies }, { data: customers }, { data: categories }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, legal_name").order("legal_name"),
    supabase.from("customers").select("id, name").eq("status", "ativo").order("name"),
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
  ]);

  return (
    <div>
      <PageHeader title="Nova receita" subtitle="Lançamento de receita recebida ou estimada" />
      <RevenueForm
        companies={companies ?? []}
        customers={customers ?? []}
        categories={categories ?? []}
        bankAccounts={bankAccounts ?? []}
      />
    </div>
  );
}

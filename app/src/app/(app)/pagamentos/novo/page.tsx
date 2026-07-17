import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PaymentForm } from "./PaymentForm";

export default async function NewPaymentPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: suppliers }, { data: categories }, { data: costCenters }, { data: bankAccounts }] =
    await Promise.all([
      supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
      supabase
        .from("suppliers")
        .select("id, legal_name, default_category_id, default_cost_center_id, default_description")
        .eq("status", "ativo")
        .order("legal_name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("cost_centers").select("id, code, name").order("code"),
      supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
    ]);

  return (
    <div>
      <PageHeader title="Novo pagamento" subtitle="Lançamento de pagamento já realizado" />
      <PaymentForm
        companies={companies ?? []}
        suppliers={suppliers ?? []}
        categories={categories ?? []}
        costCenters={costCenters ?? []}
        bankAccounts={bankAccounts ?? []}
      />
    </div>
  );
}

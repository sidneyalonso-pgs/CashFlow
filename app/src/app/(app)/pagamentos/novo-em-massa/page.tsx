import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { BulkPaymentForm } from "./BulkPaymentForm";

export default async function BulkPaymentPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: suppliers }, { data: categories }, { data: costCenters }] =
    await Promise.all([
      supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
      supabase
        .from("suppliers")
        .select("id, legal_name, default_category_id, default_cost_center_id, default_description")
        .eq("status", "ativo")
        .order("legal_name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("cost_centers").select("id, code, name").order("code"),
    ]);

  return (
    <div>
      <PageHeader
        title="Lançar em massa"
        subtitle="Preencha várias linhas de pagamento de uma só vez e salve tudo junto"
      />
      <BulkPaymentForm
        companies={companies ?? []}
        suppliers={suppliers ?? []}
        categories={categories ?? []}
        costCenters={costCenters ?? []}
      />
    </div>
  );
}

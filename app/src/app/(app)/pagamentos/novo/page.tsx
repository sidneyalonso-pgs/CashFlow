import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PaymentForm } from "./PaymentForm";

export default async function NewPaymentPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: suppliers }, { data: categories }, { data: subcategories }, { data: costCenters }, { data: projects }] =
    await Promise.all([
      supabase.from("companies").select("id, legal_name").order("legal_name"),
      supabase.from("suppliers").select("id, legal_name").order("legal_name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("subcategories").select("id, name, category_id").order("name"),
      supabase.from("cost_centers").select("id, code, name").order("code"),
      supabase.from("projects").select("id, code, name").order("code"),
    ]);

  return (
    <div>
      <PageHeader title="Novo pagamento" subtitle="Cadastro de pagamento a fornecedor" />
      <PaymentForm
        companies={companies ?? []}
        suppliers={suppliers ?? []}
        categories={categories ?? []}
        subcategories={subcategories ?? []}
        costCenters={costCenters ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}

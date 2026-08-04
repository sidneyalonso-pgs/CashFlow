import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { MerchantList } from "./MerchantList";

export default async function BillingClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("billing_clients")
    .select("*, billing_subcontas(*)")
    .order("razao");

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Cadastro de clientes, tarifas e subcontas" />
      <MerchantList clients={clients ?? []} />
    </div>
  );
}

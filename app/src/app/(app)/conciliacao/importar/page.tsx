import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ImportStatementWizard } from "./ImportStatementWizard";

export default async function ImportStatementPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, legal_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname, company_id").order("bank_name"),
  ]);

  return (
    <div>
      <PageHeader title="Importar extrato" subtitle="Importação de extrato bancário para conciliação" />
      <ImportStatementWizard companies={companies ?? []} bankAccounts={bankAccounts ?? []} />
    </div>
  );
}

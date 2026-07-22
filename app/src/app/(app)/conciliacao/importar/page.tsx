import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ImportStatementWizard } from "./ImportStatementWizard";
import { ImportHistory } from "./ImportHistory";

export default async function ImportStatementPage() {
  const supabase = createClient();
  const [{ data: companies }, { data: bankAccounts }, { data: imports }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname, company_id").order("bank_name"),
    supabase
      .from("bank_statement_imports")
      .select("id, file_name, imported_rows, total_rows, created_at, bank_accounts(bank_name, nickname)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Importar extrato" subtitle="Importação de extrato bancário para conciliação" />
      <ImportStatementWizard companies={companies ?? []} bankAccounts={bankAccounts ?? []} />
      <ImportHistory imports={(imports ?? []) as any} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmitirFaturaForm } from "./EmitirFaturaForm";

export default async function EmitirFaturaPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: companies }, { data: allSubcontas }] = await Promise.all([
    supabase.from("billing_clients").select("id, razao, modelo, in_tipo, in_val, out_tipo, out_val, rep_in, rep_out, faixas_mens").eq("status", "ativo").order("razao"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("billing_subcontas").select("id, client_id, razao, cnpj, num_conta, in_tipo, in_val, out_tipo, out_val, rep_in, rep_out"),
  ]);

  const subcontasMap: Record<string, any[]> = {};
  const subcontaCounts: Record<string, number> = {};
  for (const s of allSubcontas ?? []) {
    if (!subcontasMap[s.client_id]) subcontasMap[s.client_id] = [];
    subcontasMap[s.client_id].push(s);
    subcontaCounts[s.client_id] = (subcontaCounts[s.client_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader title="Emitir demonstrativo" subtitle="Calcule e emita um demonstrativo de repasse" />
      <EmitirFaturaForm
        clients={clients ?? []}
        companies={companies ?? []}
        subcontaCounts={subcontaCounts}
        subcontasMap={subcontasMap}
      />
    </div>
  );
}

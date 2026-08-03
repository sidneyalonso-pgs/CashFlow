import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmitirFaturaForm } from "./EmitirFaturaForm";

export default async function EmitirFaturaPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: companies }] = await Promise.all([
    supabase.from("billing_clients").select("id, razao, modelo, in_tipo, in_val, out_tipo, out_val, rep_in, rep_out, faixas_mens").eq("status", "ativo").order("razao"),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);
  return (
    <div>
      <PageHeader title="Emitir demonstrativo" subtitle="Calcule e emita um demonstrativo de repasse" />
      <EmitirFaturaForm clients={clients ?? []} companies={companies ?? []} />
    </div>
  );
}

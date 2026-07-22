"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reconcileEntry(
  bankEntryId: string,
  entityType: "payment" | "revenue",
  entityId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: reconciliationError } = await supabase.from("reconciliations").insert({
    bank_statement_entry_id: bankEntryId,
    entity_type: entityType,
    entity_id: entityId,
    matched_by: user?.id,
    match_type: "manual",
  });
  if (reconciliationError) return { error: reconciliationError.message };

  const { error: entryError } = await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "conciliado_manualmente" })
    .eq("id", bankEntryId);
  if (entryError) return { error: entryError.message };

  const table = entityType === "payment" ? "payments" : "revenues";
  const { error: entityError } = await supabase
    .from(table)
    .update({ reconciliation_status: "conciliado_manualmente" })
    .eq("id", entityId);
  if (entityError) return { error: entityError.message };

  revalidatePath("/conciliacao");
  return { error: null };
}

export async function ignoreEntry(bankEntryId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "ignorado" })
    .eq("id", bankEntryId);

  if (error) return { error: error.message };
  revalidatePath("/conciliacao");
  return { error: null };
}

export async function unreconcileEntry(bankEntryId: string) {
  const supabase = createClient();

  // Buscar reconciliação vinculada
  const { data: rec } = await supabase
    .from("reconciliations")
    .select("entity_type, entity_id")
    .eq("bank_statement_entry_id", bankEntryId)
    .single();

  if (rec) {
    const table = rec.entity_type === "payment" ? "payments" : "revenues";
    await supabase.from(table).update({ reconciliation_status: "pendente" }).eq("id", rec.entity_id);
    await supabase.from("reconciliations").delete().eq("bank_statement_entry_id", bankEntryId);
  }

  await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "pendente" })
    .eq("id", bankEntryId);

  revalidatePath("/conciliacao");
  return { error: null };
}

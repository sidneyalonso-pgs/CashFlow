"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reconcileEntry(
  bankEntryId: string,
  entityType: "payment" | "revenue" | "investment_application" | "investment_redemption" | "transfer",
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

  // Atualiza reconciliation_status só em pagamentos e receitas (investimentos não têm o campo)
  if (entityType === "payment" || entityType === "revenue") {
    const table = entityType === "payment" ? "payments" : "revenues";
    await supabase
      .from(table)
      .update({ reconciliation_status: "conciliado_manualmente" })
      .eq("id", entityId);
  }

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

/**
 * Concilia UMA linha do extrato com várias receitas que caíram juntas no mesmo crédito (Central
 * Piloto). Só confirma se a soma das receitas fecha com o valor da linha — senão nada é gravado.
 */
export async function reconcileEntryGroup(bankEntryId: string, revenueIds: string[]) {
  if (revenueIds.length === 0) return { error: "Nenhuma receita no grupo." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entry }, { data: revenues }] = await Promise.all([
    supabase.from("bank_statement_entries").select("amount").eq("id", bankEntryId).single(),
    supabase.from("revenues").select("id, realized_amount, reconciliation_status").in("id", revenueIds),
  ]);
  if (!entry || !revenues || revenues.length !== revenueIds.length) return { error: "Não encontrei a linha do extrato ou alguma das receitas." };
  if (revenues.some((r: any) => r.reconciliation_status && r.reconciliation_status !== "pendente")) {
    return { error: "Alguma receita do grupo já está conciliada." };
  }
  const soma = Math.round(revenues.reduce((s: number, r: any) => s + Number(r.realized_amount), 0) * 100) / 100;
  if (Math.abs(soma - Number(entry.amount)) > 0.01) {
    return { error: `A soma das receitas (${soma.toFixed(2)}) não bate com a linha do extrato (${Number(entry.amount).toFixed(2)}).` };
  }

  const { error: recError } = await supabase.from("reconciliations").insert(
    revenueIds.map((id) => ({
      bank_statement_entry_id: bankEntryId,
      entity_type: "revenue",
      entity_id: id,
      matched_by: user?.id,
      match_type: "manual",
      notes: "Grupo de receitas da Central Piloto",
    }))
  );
  if (recError) return { error: recError.message };

  await supabase.from("bank_statement_entries").update({ reconciliation_status: "conciliado_manualmente" }).eq("id", bankEntryId);
  await supabase.from("revenues").update({ reconciliation_status: "conciliado_manualmente" }).in("id", revenueIds);

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
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
  revalidatePath("/movimentacoes");
  return { error: null };
}

export async function unreconcileEntry(bankEntryId: string) {
  const supabase = createClient();

  // Buscar as conciliações vinculadas (um grupo da Central Piloto tem várias na mesma linha)
  const { data: recs } = await supabase
    .from("reconciliations")
    .select("entity_type, entity_id")
    .eq("bank_statement_entry_id", bankEntryId);

  if (recs && recs.length > 0) {
    for (const rec of recs) {
      // Só pagamentos e receitas têm o campo reconciliation_status — investimentos e transferências não
      if (rec.entity_type === "payment" || rec.entity_type === "revenue") {
        const table = rec.entity_type === "payment" ? "payments" : "revenues";
        await supabase.from(table).update({ reconciliation_status: "pendente" }).eq("id", rec.entity_id);
      }
    }
    await supabase.from("reconciliations").delete().eq("bank_statement_entry_id", bankEntryId);
  }

  await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "pendente" })
    .eq("id", bankEntryId);

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

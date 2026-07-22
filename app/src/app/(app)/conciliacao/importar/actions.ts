"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StatementRow } from "@/lib/parsing/bankStatement";

export async function importBankStatement(
  rows: StatementRow[],
  companyId: string,
  bankAccountId: string,
  fileName: string
) {
  if (!companyId || !bankAccountId) return { error: "Selecione empresa e conta." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: importRecord, error: importError } = await supabase
    .from("bank_statement_imports")
    .insert({
      company_id: companyId,
      bank_account_id: bankAccountId,
      file_name: fileName,
      total_rows: rows.length,
      user_id: user?.id,
    })
    .select("id")
    .single();

  if (importError || !importRecord) return { error: importError?.message ?? "Falha ao criar importação" };

  // Buscar entradas já existentes nessa conta para deduplicar
  const dates = [...new Set(rows.map((r) => r.date))];
  const { data: existing } = await supabase
    .from("bank_statement_entries")
    .select("entry_date, bank_description, amount, direction")
    .eq("bank_account_id", bankAccountId)
    .in("entry_date", dates);

  const existingKeys = new Set(
    (existing ?? []).map(
      (e: any) => `${e.entry_date}|${e.bank_description}|${e.amount}|${e.direction}`
    )
  );

  let imported = 0;
  for (const row of rows) {
    const direction = row.amount >= 0 ? "entrada" : "saida";
    const key = `${row.date}|${row.description}|${Math.abs(row.amount)}|${direction}`;
    if (existingKeys.has(key)) continue; // duplicata — pula

    const { error } = await supabase.from("bank_statement_entries").insert({
      import_id: importRecord.id,
      bank_account_id: bankAccountId,
      entry_date: row.date,
      bank_description: row.description,
      amount: Math.abs(row.amount),
      direction,
      bank_balance: row.balance,
    });

    if (!error) imported++;
  }

  await supabase.from("bank_statement_imports").update({ imported_rows: imported }).eq("id", importRecord.id);

  revalidatePath("/conciliacao");
  return { error: null, imported, total: rows.length };
}

export async function deleteStatementImport(importId: string) {
  const supabase = createClient();

  // Buscar todas as entradas deste import
  const { data: entries } = await supabase
    .from("bank_statement_entries")
    .select("id")
    .eq("import_id", importId);

  const entryIds = (entries ?? []).map((e: any) => e.id);

  if (entryIds.length > 0) {
    // Buscar reconciliações vinculadas a essas entradas
    const { data: reconciliations } = await supabase
      .from("reconciliations")
      .select("entity_type, entity_id")
      .in("bank_statement_entry_id", entryIds);

    // Reverter reconciliation_status nos pagamentos/receitas vinculados
    for (const rec of reconciliations ?? []) {
      const table = rec.entity_type === "payment" ? "payments" : "revenues";
      await supabase
        .from(table)
        .update({ reconciliation_status: "pendente" })
        .eq("id", rec.entity_id);
    }

    // Excluir os registros de reconciliação
    await supabase.from("reconciliations").delete().in("bank_statement_entry_id", entryIds);

    // Excluir as entradas do extrato
    await supabase.from("bank_statement_entries").delete().in("id", entryIds);
  }

  const { error } = await supabase.from("bank_statement_imports").delete().eq("id", importId);
  if (error) return { error: error.message };

  revalidatePath("/conciliacao");
  revalidatePath("/conciliacao/importar");
  return { error: null };
}

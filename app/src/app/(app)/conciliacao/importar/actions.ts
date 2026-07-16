"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type StatementRow = {
  data?: string;
  descricao?: string;
  valor?: string | number;
  documento?: string;
};

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

  let imported = 0;
  for (const row of rows) {
    const amount = Number(row.valor);
    if (!row.data || !amount) continue;

    const { error } = await supabase.from("bank_statement_entries").insert({
      import_id: importRecord.id,
      bank_account_id: bankAccountId,
      entry_date: row.data,
      bank_description: row.descricao ?? "",
      amount: Math.abs(amount),
      direction: amount >= 0 ? "entrada" : "saida",
      document_reference: row.documento ?? null,
    });

    if (!error) imported++;
  }

  await supabase.from("bank_statement_imports").update({ imported_rows: imported }).eq("id", importRecord.id);

  revalidatePath("/conciliacao");
  return { error: null, imported, total: rows.length };
}

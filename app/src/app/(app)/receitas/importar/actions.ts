"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportRow = {
  empresa_cnpj?: string;
  descricao?: string;
  categoria?: string;
  valor?: string | number;
  data_recebimento?: string;
  conta_recebedora?: string;
  observacoes?: string;
};

export async function importRevenues(rows: ImportRow[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: companies }, { data: categories }, { data: bankAccounts }] = await Promise.all([
    supabase.from("companies").select("id, cnpj"),
    supabase.from("categories").select("id, name").in("allowed_direction", ["entrada", "ambas"]),
    supabase.from("bank_accounts").select("id, nickname, bank_name"),
  ]);

  const companyByCnpj = new Map((companies ?? []).map((c) => [c.cnpj.replace(/\D/g, ""), c.id]));
  const categoryByName = new Map((categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));
  const bankAccountByLabel = new Map(
    (bankAccounts ?? []).map((a) => [(a.nickname ?? a.bank_name).trim().toLowerCase(), a.id])
  );

  let created = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    const companyId = companyByCnpj.get(String(row.empresa_cnpj ?? "").replace(/\D/g, ""));
    const amount = Number(String(row.valor ?? "").replace(",", "."));
    const date = String(row.data_recebimento ?? "").trim();
    const description = String(row.descricao ?? "").trim();
    const categoryName = String(row.categoria ?? "").trim().toLowerCase();
    const categoryId = categoryByName.get(categoryName) ?? null;
    const bankAccountLabel = String(row.conta_recebedora ?? "").trim().toLowerCase();
    const bankAccountId = bankAccountLabel ? (bankAccountByLabel.get(bankAccountLabel) ?? null) : null;
    const notes = String(row.observacoes ?? "").trim() || null;

    if (!companyId) {
      errors.push({ row: rowNumber, message: "Empresa não encontrada para este CNPJ" });
      continue;
    }
    if (!description) {
      errors.push({ row: rowNumber, message: "Descrição obrigatória" });
      continue;
    }
    if (!amount || amount <= 0) {
      errors.push({ row: rowNumber, message: "Valor inválido ou ausente" });
      continue;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row: rowNumber, message: "data_recebimento inválida (use YYYY-MM-DD)" });
      continue;
    }
    if (!categoryId) {
      errors.push({ row: rowNumber, message: `Categoria "${row.categoria}" não encontrada` });
      continue;
    }

    const { data: revenue, error: revenueError } = await supabase
      .from("revenues")
      .insert({
        company_id: companyId,
        description,
        expected_amount: amount,
        realized_amount: amount,
        category_id: categoryId,
        expected_date: date,
        realized_date: date,
        receiving_bank_account_id: bankAccountId,
        probability_pct: 100,
        notes,
        status: "recebida",
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select("id")
      .single();

    if (revenueError) {
      errors.push({ row: rowNumber, message: revenueError.message });
      continue;
    }

    const { error: realizationError } = await supabase.from("revenue_realizations").insert({
      revenue_id: revenue.id,
      amount,
      received_at: date,
      bank_account_id: bankAccountId,
      created_by: user?.id,
    });

    if (realizationError) {
      errors.push({ row: rowNumber, message: realizationError.message });
    } else {
      created++;
    }
  }

  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/movimentacoes");
  return { total: rows.length, created, errors };
}

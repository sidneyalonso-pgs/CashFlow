"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportRow = {
  empresa_cnpj?: string;
  fornecedor_documento?: string;
  descricao?: string;
  categoria?: string;
  centro_custo?: string;
  semana_do_mes?: string | number;
  dia_do_mes?: string | number;
  conta_pagadora?: string;
};

export async function importRecurringTemplates(rows: ImportRow[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: companies }, { data: suppliers }, { data: categories }, { data: costCenters }, { data: bankAccounts }] =
    await Promise.all([
      supabase.from("companies").select("id, cnpj"),
      supabase.from("suppliers").select("id, tax_id"),
      supabase.from("categories").select("id, name"),
      supabase.from("cost_centers").select("id, code"),
      supabase.from("bank_accounts").select("id, nickname, bank_name"),
    ]);

  const companyByCnpj = new Map((companies ?? []).map((c) => [c.cnpj.replace(/\D/g, ""), c.id]));
  const supplierByDoc = new Map((suppliers ?? []).map((s) => [s.tax_id.replace(/\D/g, ""), s.id]));
  const categoryByName = new Map((categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));
  const costCenterByCode = new Map((costCenters ?? []).map((c) => [c.code.trim().toLowerCase(), c.id]));
  const bankAccountByLabel = new Map(
    (bankAccounts ?? []).map((a) => [(a.nickname ?? a.bank_name).trim().toLowerCase(), a.id])
  );

  let created = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    const companyId = companyByCnpj.get(String(row.empresa_cnpj ?? "").replace(/\D/g, ""));
    const supplierId = supplierByDoc.get(String(row.fornecedor_documento ?? "").replace(/\D/g, ""));
    const weekOfMonth = row.semana_do_mes ? Number(row.semana_do_mes) : null;
    const dayOfMonth = row.dia_do_mes ? Number(row.dia_do_mes) : null;

    if (!companyId) {
      errors.push({ row: rowNumber, message: "Empresa não encontrada para este CNPJ" });
      continue;
    }
    if (!supplierId) {
      errors.push({ row: rowNumber, message: "Fornecedor não encontrado para este documento" });
      continue;
    }
    if (!row.descricao) {
      errors.push({ row: rowNumber, message: "Descrição obrigatória" });
      continue;
    }
    if (!weekOfMonth && !dayOfMonth) {
      errors.push({ row: rowNumber, message: "Informe semana_do_mes (1-5) ou dia_do_mes (1-28)" });
      continue;
    }

    const { error } = await supabase.from("recurring_payment_templates").insert({
      company_id: companyId,
      supplier_id: supplierId,
      description: row.descricao,
      week_of_month: weekOfMonth,
      day_of_month: dayOfMonth,
      category_id: row.categoria ? categoryByName.get(row.categoria.trim().toLowerCase()) ?? null : null,
      cost_center_id: row.centro_custo ? costCenterByCode.get(row.centro_custo.trim().toLowerCase()) ?? null : null,
      paying_bank_account_id: row.conta_pagadora ? bankAccountByLabel.get(row.conta_pagadora.trim().toLowerCase()) ?? null : null,
      created_by: user?.id,
    });

    if (error) errors.push({ row: rowNumber, message: error.message });
    else created++;
  }

  revalidatePath("/pagamentos/recorrentes");
  return { total: rows.length, created, errors };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ImportRow = {
  empresa_cnpj?: string;
  fornecedor_documento?: string;
  descricao?: string;
  valor?: string | number;
  categoria?: string;
  documento?: string;
  data_documento?: string;
  vencimento?: string;
  data_prevista_pagamento?: string;
  competencia?: string;
};

export async function importPayments(rows: ImportRow[], fileName: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: companies }, { data: suppliers }, { data: categories }] = await Promise.all([
    supabase.from("companies").select("id, cnpj"),
    supabase.from("suppliers").select("id, tax_id"),
    supabase.from("categories").select("id, name"),
  ]);

  const companyByCnpj = new Map((companies ?? []).map((c) => [c.cnpj.replace(/\D/g, ""), c.id]));
  const supplierByDoc = new Map((suppliers ?? []).map((s) => [s.tax_id.replace(/\D/g, ""), s.id]));
  const categoryByName = new Map((categories ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ import_type: "pagamentos", file_name: fileName, user_id: user?.id, total_rows: rows.length, status: "processando" })
    .select("id")
    .single();

  if (batchError || !batch) return { error: batchError?.message ?? "Falha ao criar lote de importação" };

  let valid = 0;
  let rejected = 0;
  const errors: Array<{ row: number; field: string; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // considerando linha 1 como cabeçalho

    const companyId = companyByCnpj.get(String(row.empresa_cnpj ?? "").replace(/\D/g, ""));
    const supplierId = supplierByDoc.get(String(row.fornecedor_documento ?? "").replace(/\D/g, ""));
    const categoryId = categoryByName.get(String(row.categoria ?? "").trim().toLowerCase());
    const amount = Number(row.valor);

    if (!companyId) {
      errors.push({ row: rowNumber, field: "empresa_cnpj", message: "Empresa não encontrada para este CNPJ" });
    }
    if (!supplierId) {
      errors.push({ row: rowNumber, field: "fornecedor_documento", message: "Fornecedor não encontrado para este documento" });
    }
    if (!categoryId) {
      errors.push({ row: rowNumber, field: "categoria", message: "Categoria não encontrada" });
    }
    if (!row.descricao) {
      errors.push({ row: rowNumber, field: "descricao", message: "Descrição obrigatória" });
    }
    if (!amount || amount <= 0) {
      errors.push({ row: rowNumber, field: "valor", message: "Valor inválido" });
    }
    if (!row.documento) {
      errors.push({ row: rowNumber, field: "documento", message: "Número do documento obrigatório" });
    }
    if (!row.data_documento || !row.vencimento || !row.data_prevista_pagamento || !row.competencia) {
      errors.push({ row: rowNumber, field: "datas", message: "Todas as datas são obrigatórias" });
    }

    const hasErrorThisRow = errors.some((e) => e.row === rowNumber);
    if (hasErrorThisRow) {
      rejected++;
      continue;
    }

    const { error: insertError } = await supabase.from("payments").insert({
      company_id: companyId,
      supplier_id: supplierId,
      category_id: categoryId,
      description: row.descricao,
      gross_amount: amount,
      currency: "BRL",
      document_number: row.documento,
      document_date: row.data_documento,
      due_date: row.vencimento,
      expected_payment_date: row.data_prevista_pagamento,
      competence_date: row.competencia,
      status: "rascunho",
      created_by: user?.id,
      updated_by: user?.id,
    });

    if (insertError) {
      errors.push({ row: rowNumber, field: "geral", message: insertError.message });
      rejected++;
    } else {
      valid++;
    }
  }

  if (errors.length > 0) {
    await supabase.from("import_errors").insert(
      errors.map((e) => ({
        import_batch_id: batch.id,
        row_number: e.row,
        field_name: e.field,
        error_message: e.message,
      }))
    );
  }

  await supabase
    .from("import_batches")
    .update({
      valid_rows: valid,
      rejected_rows: rejected,
      imported_rows: valid,
      status: "concluido",
    })
    .eq("id", batch.id);

  revalidatePath("/pagamentos");
  return { batchId: batch.id, total: rows.length, valid, rejected, errors };
}

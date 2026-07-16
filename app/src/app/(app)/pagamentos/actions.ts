"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPaidPayment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const paidAt = String(formData.get("paid_at") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const bankAccountId = String(formData.get("paying_bank_account_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const recurring = formData.get("recurring") === "on";

  if (!companyId || !supplierId || !description || !grossAmount || grossAmount <= 0 || !paidAt) {
    return { error: "Preencha empresa, fornecedor, descrição, valor e data do pagamento." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      company_id: companyId,
      supplier_id: supplierId,
      description,
      gross_amount: grossAmount,
      currency: "BRL",
      category_id: categoryId,
      cost_center_id: costCenterId,
      paying_bank_account_id: bankAccountId,
      document_date: paidAt,
      due_date: paidAt,
      expected_payment_date: paidAt,
      competence_date: paidAt,
      effective_payment_date: paidAt,
      paid_amount: grossAmount,
      recurring,
      notes,
      status: "pago",
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: realizationError } = await supabase.from("payment_realizations").insert({
    payment_id: payment.id,
    amount: grossAmount,
    paid_at: paidAt,
    bank_account_id: bankAccountId,
    created_by: user?.id,
  });

  if (realizationError) return { error: realizationError.message };

  revalidatePath("/pagamentos");
  redirect("/pagamentos");
}

export async function createScheduledPayment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const expectedDate = String(formData.get("expected_payment_date") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const bankAccountId = String(formData.get("paying_bank_account_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const recurring = formData.get("recurring") === "on";

  if (!companyId || !supplierId || !description || !grossAmount || grossAmount <= 0 || !expectedDate) {
    return { error: "Preencha empresa, fornecedor, descrição, valor e data prevista." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("payments").insert({
    company_id: companyId,
    supplier_id: supplierId,
    description,
    gross_amount: grossAmount,
    currency: "BRL",
    category_id: categoryId,
    cost_center_id: costCenterId,
    paying_bank_account_id: bankAccountId,
    document_date: expectedDate,
    due_date: expectedDate,
    expected_payment_date: expectedDate,
    competence_date: expectedDate,
    recurring,
    notes,
    status: "agendado",
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/pagamentos");
  redirect("/pagamentos");
}

export async function settlePayment(paymentId: string, amount: number, paidAt: string, bankAccountId: string | null) {
  if (!amount || amount <= 0) return { error: "Valor deve ser maior que zero" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: realizationError } = await supabase.from("payment_realizations").insert({
    payment_id: paymentId,
    amount,
    paid_at: paidAt,
    bank_account_id: bankAccountId,
    created_by: user?.id,
  });
  if (realizationError) return { error: realizationError.message };

  const { error } = await supabase
    .from("payments")
    .update({
      status: "pago",
      gross_amount: amount,
      paid_amount: amount,
      effective_payment_date: paidAt,
      due_date: paidAt,
      expected_payment_date: paidAt,
      competence_date: paidAt,
      document_date: paidAt,
    })
    .eq("id", paymentId);

  if (error) return { error: error.message };

  revalidatePath("/pagamentos");
  return { error: null };
}

export async function bulkSettlePayments(
  entries: Array<{ id: string; amount: number; paidAt: string; bankAccountId: string | null }>
) {
  const results = await Promise.all(
    entries.map((e) => settlePayment(e.id, e.amount, e.paidAt, e.bankAccountId))
  );
  const errors = results.filter((r) => r.error).map((r) => r.error as string);
  revalidatePath("/pagamentos");
  return { errors };
}

export async function recordAttachment(params: {
  paymentId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attachments").insert({
    entity_type: "payment",
    entity_id: params.paymentId,
    storage_path: params.storagePath,
    original_name: params.originalName,
    content_type: params.contentType,
    size_bytes: params.sizeBytes,
    uploaded_by: user?.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${params.paymentId}`);
  return { error: null };
}

export async function cancelPayment(paymentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("payments").update({ status: "cancelado" }).eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${paymentId}`);
  revalidatePath("/pagamentos");
  return { error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertReasonableDate } from "@/lib/validators/dateSanity";

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

  if (!companyId || !supplierId || !grossAmount || grossAmount <= 0 || !paidAt) {
    return { error: "Preencha empresa, fornecedor, valor e data do pagamento." };
  }

  const dateError = assertReasonableDate(paidAt, "Data do pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("legal_name, cost_type, default_description")
    .eq("id", supplierId)
    .single();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      company_id: companyId,
      supplier_id: supplierId,
      description: description || supplier?.default_description || supplier?.legal_name || "Pagamento",
      gross_amount: grossAmount,
      currency: "BRL",
      category_id: categoryId,
      cost_center_id: costCenterId,
      cost_type: supplier?.cost_type ?? "despesas",
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

  if (!companyId || !supplierId || !grossAmount || grossAmount <= 0 || !expectedDate) {
    return { error: "Preencha empresa, fornecedor, valor e data prevista." };
  }

  const dateError = assertReasonableDate(expectedDate, "Data prevista de pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("legal_name, cost_type, default_description")
    .eq("id", supplierId)
    .single();

  const { error } = await supabase.from("payments").insert({
    company_id: companyId,
    supplier_id: supplierId,
    description: description || supplier?.default_description || supplier?.legal_name || "Pagamento",
    gross_amount: grossAmount,
    currency: "BRL",
    category_id: categoryId,
    cost_center_id: costCenterId,
    cost_type: supplier?.cost_type ?? "despesas",
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

  const dateError = assertReasonableDate(paidAt, "Data do pagamento");
  if (dateError) return { error: dateError };

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

export async function updatePayment(paymentId: string, formData: FormData) {
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const dueDate = String(formData.get("due_date") || "") || null;

  if (!grossAmount || grossAmount <= 0) {
    return { error: "Preencha o valor." };
  }
  if (dueDate) {
    const dateError = assertReasonableDate(dueDate, "Data de vencimento");
    if (dateError) return { error: dateError };
  }

  const supabase = createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("status, suppliers(legal_name, default_description)")
    .eq("id", paymentId)
    .single();

  const finalDescription =
    description ||
    (payment as any)?.suppliers?.default_description ||
    (payment as any)?.suppliers?.legal_name ||
    "Pagamento";

  const update: Record<string, unknown> = {
    description: finalDescription,
    gross_amount: grossAmount,
    category_id: categoryId,
    cost_center_id: costCenterId,
    notes,
  };

  if (dueDate) {
    update.due_date = dueDate;
    update.expected_payment_date = dueDate;
  }

  if (payment?.status === "pago" && dueDate) {
    update.paid_amount = grossAmount;
    update.effective_payment_date = dueDate;
    update.competence_date = dueDate;
    update.document_date = dueDate;

    const { data: realizations } = await supabase
      .from("payment_realizations")
      .select("id")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (realizations && realizations.length > 0) {
      await supabase
        .from("payment_realizations")
        .update({ amount: grossAmount, paid_at: dueDate })
        .eq("id", realizations[0].id);
    }
  }

  const { error } = await supabase.from("payments").update(update).eq("id", paymentId);

  if (error) return { error: error.message };

  revalidatePath(`/pagamentos/${paymentId}`);
  revalidatePath("/pagamentos");
  return { error: null };
}

export async function updatePaymentDueDate(paymentId: string, dueDate: string) {
  if (!dueDate) return { error: "Informe a data de vencimento." };

  const dateError = assertReasonableDate(dueDate, "Data de vencimento");
  if (dateError) return { error: dateError };

  const supabase = createClient();

  const { data: payment } = await supabase.from("payments").select("status").eq("id", paymentId).single();

  const update: Record<string, unknown> = {
    due_date: dueDate,
    expected_payment_date: dueDate,
  };

  if (payment?.status === "pago") {
    update.effective_payment_date = dueDate;
    update.competence_date = dueDate;
    update.document_date = dueDate;

    const { data: realizations } = await supabase
      .from("payment_realizations")
      .select("id")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (realizations && realizations.length > 0) {
      await supabase.from("payment_realizations").update({ paid_at: dueDate }).eq("id", realizations[0].id);
    }
  }

  const { error } = await supabase.from("payments").update(update).eq("id", paymentId);

  if (error) return { error: error.message };

  revalidatePath("/pagamentos");
  revalidatePath(`/pagamentos/${paymentId}`);
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

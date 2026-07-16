"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validators/payment";

export async function createPayment(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = paymentSchema.safeParse({
    ...raw,
    subcategory_id: raw.subcategory_id || undefined,
    cost_center_id: raw.cost_center_id || undefined,
    project_id: raw.project_id || undefined,
    payment_method: raw.payment_method || undefined,
    notes: raw.notes || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { gross_amount, ...rest } = parsed.data;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      ...rest,
      gross_amount,
      status: "rascunho",
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/pagamentos");
  redirect(`/pagamentos/${payment.id}`);
}

export async function submitForApproval(paymentId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "pendente_aprovacao" })
    .eq("id", paymentId);

  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${paymentId}`);
  return { error: null };
}

export async function decidePayment(paymentId: string, decision: "aprovado" | "rejeitado", notes: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: approvalError } = await supabase.from("approvals").insert({
    payment_id: paymentId,
    approver_id: user?.id,
    decision,
    notes: notes || null,
  });
  if (approvalError) return { error: approvalError.message };

  const { error } = await supabase
    .from("payments")
    .update({
      status: decision,
      approver_id: user?.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${paymentId}`);
  return { error: null };
}

export async function scheduleReturnForCorrection(paymentId: string, notes: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: approvalError } = await supabase.from("approvals").insert({
    payment_id: paymentId,
    approver_id: user?.id,
    decision: "devolvido",
    notes: notes || null,
  });
  if (approvalError) return { error: approvalError.message };

  const { error } = await supabase.from("payments").update({ status: "rascunho" }).eq("id", paymentId);
  if (error) return { error: error.message };

  revalidatePath(`/pagamentos/${paymentId}`);
  return { error: null };
}

export async function registerRealization(formData: FormData) {
  const paymentId = String(formData.get("payment_id"));
  const amount = Number(formData.get("amount"));
  const paidAt = String(formData.get("paid_at"));
  const bankAccountId = String(formData.get("bank_account_id") || "") || null;

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

  const { data: payment } = await supabase
    .from("payments")
    .select("gross_amount, payment_realizations(amount)")
    .eq("id", paymentId)
    .single();

  if (payment) {
    const totalPaid = (payment.payment_realizations ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.amount),
      0
    );
    const newStatus = totalPaid >= Number(payment.gross_amount) ? "pago" : "pago_parcialmente";

    await supabase
      .from("payments")
      .update({
        status: newStatus,
        effective_payment_date: paidAt,
        paid_amount: totalPaid,
      })
      .eq("id", paymentId);
  }

  revalidatePath(`/pagamentos/${paymentId}`);
  return { error: null };
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
  return { error: null };
}

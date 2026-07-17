"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertReasonableDate } from "@/lib/validators/dateSanity";

export async function createReceivedRevenue(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const customerId = String(formData.get("customer_id") || "") || null;
  const description = String(formData.get("description") || "");
  const amount = Number(formData.get("expected_amount"));
  const receivedAt = String(formData.get("received_at") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const bankAccountId = String(formData.get("receiving_bank_account_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  if (!companyId || !description || !amount || amount <= 0 || !receivedAt) {
    return { error: "Preencha empresa, descrição, valor e data do recebimento." };
  }

  const dateError = assertReasonableDate(receivedAt, "Data do recebimento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: revenue, error } = await supabase
    .from("revenues")
    .insert({
      company_id: companyId,
      customer_id: customerId,
      description,
      expected_amount: amount,
      realized_amount: amount,
      category_id: categoryId,
      expected_date: receivedAt,
      realized_date: receivedAt,
      receiving_bank_account_id: bankAccountId,
      probability_pct: 100,
      notes,
      status: "recebida",
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: realizationError } = await supabase.from("revenue_realizations").insert({
    revenue_id: revenue.id,
    amount,
    received_at: receivedAt,
    bank_account_id: bankAccountId,
    created_by: user?.id,
  });

  if (realizationError) return { error: realizationError.message };

  revalidatePath("/receitas");
  redirect("/receitas");
}

export async function createEstimatedRevenue(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const customerId = String(formData.get("customer_id") || "") || null;
  const description = String(formData.get("description") || "");
  const amount = Number(formData.get("expected_amount"));
  const expectedDate = String(formData.get("expected_date") || "");
  const probability = Number(formData.get("probability_pct") || 100);
  const categoryId = String(formData.get("category_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  if (!companyId || !description || !amount || amount <= 0 || !expectedDate) {
    return { error: "Preencha empresa, descrição, valor e data prevista." };
  }

  const dateError = assertReasonableDate(expectedDate, "Data prevista");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("revenues").insert({
    company_id: companyId,
    customer_id: customerId,
    description,
    expected_amount: amount,
    category_id: categoryId,
    expected_date: expectedDate,
    probability_pct: probability,
    notes,
    status: "estimada",
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/receitas");
  redirect("/receitas");
}

export async function settleRevenue(revenueId: string, amount: number, receivedAt: string, bankAccountId: string | null) {
  if (!amount || amount <= 0) return { error: "Valor deve ser maior que zero" };

  const dateError = assertReasonableDate(receivedAt, "Data do recebimento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: realizationError } = await supabase.from("revenue_realizations").insert({
    revenue_id: revenueId,
    amount,
    received_at: receivedAt,
    bank_account_id: bankAccountId,
    created_by: user?.id,
  });
  if (realizationError) return { error: realizationError.message };

  const { error } = await supabase
    .from("revenues")
    .update({
      status: "recebida",
      realized_amount: amount,
      realized_date: receivedAt,
      receiving_bank_account_id: bankAccountId,
    })
    .eq("id", revenueId);

  if (error) return { error: error.message };

  revalidatePath("/receitas");
  return { error: null };
}

export async function updateRevenue(revenueId: string, formData: FormData) {
  const description = String(formData.get("description") || "");
  const customerId = String(formData.get("customer_id") || "") || null;
  const categoryId = String(formData.get("category_id") || "") || null;
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") || "") || null;

  if (!description || !amount || amount <= 0) {
    return { error: "Preencha descrição e valor." };
  }

  const supabase = createClient();
  const { data: revenue } = await supabase.from("revenues").select("status").eq("id", revenueId).single();

  const update: Record<string, unknown> = {
    description,
    customer_id: customerId,
    category_id: categoryId,
    notes,
  };

  if (revenue?.status === "recebida") {
    update.realized_amount = amount;

    const { data: realizations } = await supabase
      .from("revenue_realizations")
      .select("id")
      .eq("revenue_id", revenueId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (realizations && realizations.length > 0) {
      await supabase.from("revenue_realizations").update({ amount }).eq("id", realizations[0].id);
    }
  } else {
    update.expected_amount = amount;
  }

  const { error } = await supabase.from("revenues").update(update).eq("id", revenueId);

  if (error) return { error: error.message };

  revalidatePath("/receitas");
  return { error: null };
}

export async function cancelRevenue(revenueId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("revenues").update({ status: "cancelada" }).eq("id", revenueId);
  if (error) return { error: error.message };
  revalidatePath("/receitas");
  return { error: null };
}

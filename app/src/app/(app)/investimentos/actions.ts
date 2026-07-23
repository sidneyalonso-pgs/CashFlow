"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createInvestment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const bankAccountId = String(formData.get("bank_account_id") || "") || null;
  const product = String(formData.get("product") || "");
  const amount = Number(formData.get("applied_amount"));
  const date = String(formData.get("applied_date") || "");
  const tipo = String(formData.get("tipo") || "aplicacao") as "aplicacao" | "resgate";
  const isOpeningBalance = formData.get("is_opening_balance") === "true";

  if (!companyId || !product || !amount || amount <= 0 || !date) {
    return { error: "Preencha empresa, produto, valor e data." };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("investments").insert({
    company_id: companyId,
    bank_account_id: bankAccountId,
    institution: product, // reutilizando campo institution para compatibilidade
    product,
    tipo,
    applied_amount: amount,
    applied_date: date,
    is_opening_balance: tipo === "aplicacao" ? isOpeningBalance : false,
    // Resgates: marcar campos herdados para compatibilidade
    ...(tipo === "resgate" ? {
      redeemed_amount: amount,
      redeemed_date: date,
      status: "resgatado",
    } : {
      status: "ativo",
    }),
    created_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/investimentos");
  revalidatePath("/cash-flow");
  revalidatePath("/movimentacoes");
  return { error: null };
}

export async function deleteInvestment(investmentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("investments").delete().eq("id", investmentId);
  if (error) return { error: error.message };
  revalidatePath("/investimentos");
  revalidatePath("/cash-flow");
  revalidatePath("/movimentacoes");
  return { error: null };
}

// Mantido para compatibilidade com código legado
export async function updateInvestment(investmentId: string, formData: FormData) {
  const product = String(formData.get("product") || "");
  const amount = Number(formData.get("applied_amount"));
  const date = String(formData.get("applied_date") || "");
  const companyId = String(formData.get("company_id") || "");
  const bankAccountId = String(formData.get("bank_account_id") || "") || null;

  if (!companyId || !product || !amount || amount <= 0 || !date) {
    return { error: "Preencha empresa, produto, valor e data." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("investments")
    .update({ company_id: companyId, bank_account_id: bankAccountId, institution: product, product, applied_amount: amount, applied_date: date })
    .eq("id", investmentId);

  if (error) return { error: error.message };
  revalidatePath("/investimentos");
  revalidatePath("/cash-flow");
  return { error: null };
}

export async function redeemInvestment(investmentId: string, amount: number, redeemedDate: string) {
  const supabase = createClient();
  const { data: inv } = await supabase.from("investments").select("applied_amount, redeemed_amount").eq("id", investmentId).single();
  if (!inv) return { error: "Investimento não encontrado" };
  const newRedeemed = Number(inv.redeemed_amount) + amount;
  const status = newRedeemed >= Number(inv.applied_amount) ? "resgatado" : "parcialmente_resgatado";
  const { error } = await supabase.from("investments").update({ redeemed_amount: newRedeemed, redeemed_date: redeemedDate, status }).eq("id", investmentId);
  if (error) return { error: error.message };
  revalidatePath("/investimentos");
  return { error: null };
}

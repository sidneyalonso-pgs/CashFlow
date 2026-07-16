"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createInvestment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const bankAccountId = String(formData.get("bank_account_id") || "") || null;
  const institution = String(formData.get("institution") || "");
  const product = String(formData.get("product") || "");
  const appliedAmount = Number(formData.get("applied_amount"));
  const appliedDate = String(formData.get("applied_date") || "");
  const dueDate = String(formData.get("due_date") || "") || null;
  const liquidity = String(formData.get("liquidity") || "") || null;
  const rate = String(formData.get("rate") || "") || null;
  const indexer = String(formData.get("indexer") || "") || null;

  if (!companyId || !institution || !product || !appliedAmount || appliedAmount <= 0 || !appliedDate) {
    return { error: "Preencha empresa, instituição, produto, valor aplicado e data da aplicação." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("investments").insert({
    company_id: companyId,
    bank_account_id: bankAccountId,
    institution,
    product,
    applied_amount: appliedAmount,
    applied_date: appliedDate,
    due_date: dueDate,
    liquidity,
    rate,
    indexer,
    created_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/investimentos");
  return { error: null };
}

export async function redeemInvestment(investmentId: string, amount: number, redeemedDate: string) {
  const supabase = createClient();

  const { data: investment, error: fetchError } = await supabase
    .from("investments")
    .select("applied_amount, redeemed_amount")
    .eq("id", investmentId)
    .single();

  if (fetchError || !investment) return { error: fetchError?.message ?? "Investimento não encontrado" };

  const newRedeemed = Number(investment.redeemed_amount) + amount;
  const status = newRedeemed >= Number(investment.applied_amount) ? "resgatado" : "parcialmente_resgatado";

  const { error } = await supabase
    .from("investments")
    .update({ redeemed_amount: newRedeemed, redeemed_date: redeemedDate, status })
    .eq("id", investmentId);

  if (error) return { error: error.message };

  revalidatePath("/investimentos");
  return { error: null };
}

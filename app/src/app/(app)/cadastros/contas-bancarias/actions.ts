"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bankAccountSchema } from "@/lib/validators/registrations";

export async function createBankAccount(formData: FormData) {
  const parsed = bankAccountSchema.safeParse({
    company_id: formData.get("company_id"),
    bank_name: formData.get("bank_name"),
    bank_code: formData.get("bank_code") || undefined,
    branch: formData.get("branch") || undefined,
    account_number: formData.get("account_number"),
    nickname: formData.get("nickname") || undefined,
    account_type: formData.get("account_type"),
    currency: formData.get("currency") || "BRL",
    initial_balance: formData.get("initial_balance") || 0,
    counts_as_available_cash: formData.get("counts_as_available_cash") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("bank_accounts").insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/contas-bancarias");
  return { error: null };
}

export async function updateBankAccount(accountId: string, formData: FormData) {
  const parsed = bankAccountSchema.safeParse({
    company_id: formData.get("company_id"),
    bank_name: formData.get("bank_name"),
    bank_code: formData.get("bank_code") || undefined,
    branch: formData.get("branch") || undefined,
    account_number: formData.get("account_number"),
    nickname: formData.get("nickname") || undefined,
    account_type: formData.get("account_type"),
    currency: formData.get("currency") || "BRL",
    initial_balance: formData.get("initial_balance") || 0,
    counts_as_available_cash: formData.get("counts_as_available_cash") === "on",
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("bank_accounts").update(parsed.data).eq("id", accountId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/contas-bancarias");
  return { error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTransfer(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tipo = String(formData.get("tipo") || "");
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const transferDate = String(formData.get("transfer_date") || "");
  const counterpartName = String(formData.get("counterpart_name") || "").trim();
  const fromAccountId = String(formData.get("from_account_id") || "") || null;
  const toAccountId = String(formData.get("to_account_id") || "") || null;
  const companyId = String(formData.get("company_id") || "");

  if (!tipo) return { error: "Selecione o tipo de transferência." };
  if (!amount || amount <= 0) return { error: "Informe o valor." };
  if (!transferDate) return { error: "Informe a data." };
  if (!companyId) return { error: "Selecione a empresa." };

  // Para transferência interna, busca a empresa da conta de destino
  let toCompanyId: string | null = null;
  if (tipo === "transferencia_interna" && toAccountId) {
    const { data: toAcc } = await supabase
      .from("bank_accounts")
      .select("company_id")
      .eq("id", toAccountId)
      .single();
    toCompanyId = toAcc?.company_id ?? null;
  }

  const { error } = await supabase.from("transfers").insert({
    tipo,
    description: description || null,
    amount,
    transfer_date: transferDate,
    counterpart_name: counterpartName || null,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    company_id: companyId,
    to_company_id: toCompanyId,
    created_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/transferencias");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/");
  return { error: null };
}

export async function updateTransfer(id: string, formData: FormData) {
  const supabase = createClient();

  const tipo = String(formData.get("tipo") || "");
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const transferDate = String(formData.get("transfer_date") || "");
  const counterpartName = String(formData.get("counterpart_name") || "").trim();
  const fromAccountId = String(formData.get("from_account_id") || "") || null;
  const toAccountId = String(formData.get("to_account_id") || "") || null;
  const companyId = String(formData.get("company_id") || "");

  if (!tipo || !amount || !transferDate || !companyId) return { error: "Dados obrigatórios faltando." };

  let toCompanyId: string | null = null;
  if (tipo === "transferencia_interna" && toAccountId) {
    const { data: toAcc } = await supabase.from("bank_accounts").select("company_id").eq("id", toAccountId).single();
    toCompanyId = toAcc?.company_id ?? null;
  }

  const { error } = await supabase.from("transfers").update({
    tipo, description: description || null, amount, transfer_date: transferDate,
    counterpart_name: counterpartName || null, from_account_id: fromAccountId,
    to_account_id: toAccountId, company_id: companyId, to_company_id: toCompanyId,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/transferencias");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/");
  return { error: null };
}

export async function deleteTransfer(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/transferencias");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/");
  return { error: null };
}

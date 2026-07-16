"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTemplate(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const description = String(formData.get("description") || "");
  const dayOfMonth = Number(formData.get("day_of_month"));
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const bankAccountId = String(formData.get("paying_bank_account_id") || "") || null;

  if (!companyId || !supplierId || !description || !dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28) {
    return { error: "Preencha empresa, fornecedor, descrição e um dia do mês entre 1 e 28." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("recurring_payment_templates").insert({
    company_id: companyId,
    supplier_id: supplierId,
    description,
    day_of_month: dayOfMonth,
    category_id: categoryId,
    cost_center_id: costCenterId,
    paying_bank_account_id: bankAccountId,
    created_by: user?.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/pagamentos/fixos");
  return { error: null };
}

export async function toggleTemplateActive(templateId: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("recurring_payment_templates")
    .update({ active })
    .eq("id", templateId);

  if (error) return { error: error.message };
  revalidatePath("/pagamentos/fixos");
  return { error: null };
}

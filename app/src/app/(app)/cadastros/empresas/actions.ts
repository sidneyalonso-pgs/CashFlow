"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companySchema } from "@/lib/validators/company";

export async function createCompany(formData: FormData) {
  const parsed = companySchema.safeParse({
    legal_name: formData.get("legal_name"),
    trade_name: formData.get("trade_name") || undefined,
    cnpj: formData.get("cnpj"),
    default_currency: formData.get("default_currency") || "BRL",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("companies").insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cadastros/empresas");
  return { error: null };
}

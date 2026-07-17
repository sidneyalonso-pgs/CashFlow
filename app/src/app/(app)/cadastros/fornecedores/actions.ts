"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validators/registrations";

export async function createSupplier(formData: FormData) {
  const parsed = supplierSchema.safeParse({
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id"),
    person_type: formData.get("person_type"),
    trade_name: formData.get("trade_name") || undefined,
    pix_key: formData.get("pix_key") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { email, ...data } = parsed.data;
  const { error } = await supabase.from("suppliers").insert({
    ...data,
    email: email || null,
    default_category_id: String(formData.get("default_category_id") || "") || null,
    default_cost_center_id: String(formData.get("default_cost_center_id") || "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const parsed = supplierSchema.safeParse({
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id"),
    person_type: formData.get("person_type"),
    trade_name: formData.get("trade_name") || undefined,
    pix_key: formData.get("pix_key") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { email, ...data } = parsed.data;
  const { error } = await supabase
    .from("suppliers")
    .update({
      ...data,
      email: email || null,
      default_category_id: String(formData.get("default_category_id") || "") || null,
      default_cost_center_id: String(formData.get("default_cost_center_id") || "") || null,
    })
    .eq("id", supplierId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validators/registrations";

export async function createSupplier(formData: FormData) {
  const parsed = supplierSchema.safeParse({
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id") || "",
    cost_type: formData.get("cost_type") || "despesas",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { tax_id, ...rest } = parsed.data;
  const { error } = await supabase.from("suppliers").insert({
    ...rest,
    tax_id: tax_id || null,
    person_type: "juridica",
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
    tax_id: formData.get("tax_id") || "",
    cost_type: formData.get("cost_type") || "despesas",
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { tax_id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("suppliers")
    .update({
      ...rest,
      tax_id: tax_id || null,
      default_category_id: String(formData.get("default_category_id") || "") || null,
      default_cost_center_id: String(formData.get("default_cost_center_id") || "") || null,
    })
    .eq("id", supplierId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

export async function deleteSupplier(supplierId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

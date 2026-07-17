"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validators/registrations";

export async function createCategory(formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    allowed_direction: formData.get("allowed_direction") || "ambas",
    financial_nature: formData.get("financial_nature") || undefined,
    economic_classification: formData.get("economic_classification") || undefined,
    fpa_classification: formData.get("fpa_classification") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("categories").insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/categorias");
  return { error: null };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    allowed_direction: formData.get("allowed_direction") || "ambas",
    financial_nature: formData.get("financial_nature") || undefined,
    economic_classification: formData.get("economic_classification") || undefined,
    fpa_classification: formData.get("fpa_classification") || undefined,
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("categories").update(parsed.data).eq("id", categoryId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/categorias");
  return { error: null };
}

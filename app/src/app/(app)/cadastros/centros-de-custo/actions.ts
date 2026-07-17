"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { costCenterSchema } from "@/lib/validators/registrations";

export async function createCostCenter(formData: FormData) {
  const parsed = costCenterSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    company_id: formData.get("company_id"),
    responsible_area: formData.get("responsible_area") || undefined,
    manager_name: formData.get("manager_name") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("cost_centers").insert(parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/centros-de-custo");
  return { error: null };
}

export async function updateCostCenter(costCenterId: string, formData: FormData) {
  const parsed = costCenterSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    company_id: formData.get("company_id"),
    responsible_area: formData.get("responsible_area") || undefined,
    manager_name: formData.get("manager_name") || undefined,
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("cost_centers").update(parsed.data).eq("id", costCenterId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/centros-de-custo");
  return { error: null };
}

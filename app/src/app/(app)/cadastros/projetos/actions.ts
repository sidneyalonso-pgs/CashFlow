"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validators/registrations";

export async function createProject(formData: FormData) {
  const parsed = projectSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    company_id: formData.get("company_id"),
    cost_center_id: formData.get("cost_center_id") || "",
    responsible_name: formData.get("responsible_name") || undefined,
    start_date: formData.get("start_date") || undefined,
    end_date: formData.get("end_date") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { cost_center_id, ...data } = parsed.data;
  const { error } = await supabase
    .from("projects")
    .insert({ ...data, cost_center_id: cost_center_id || null });

  if (error) return { error: error.message };

  revalidatePath("/cadastros/projetos");
  return { error: null };
}

export async function updateProject(projectId: string, formData: FormData) {
  const parsed = projectSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    company_id: formData.get("company_id"),
    cost_center_id: formData.get("cost_center_id") || "",
    responsible_name: formData.get("responsible_name") || undefined,
    start_date: formData.get("start_date") || undefined,
    end_date: formData.get("end_date") || undefined,
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { cost_center_id, ...data } = parsed.data;
  const { error } = await supabase
    .from("projects")
    .update({ ...data, cost_center_id: cost_center_id || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/projetos");
  return { error: null };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

const VALID_ROLES = ["administrador", "tesouraria", "aprovador", "conciliacao", "fpa", "visualizador"];

export async function inviteUser(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!fullName || !email) return { error: "Preencha nome e e-mail." };

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error) return { error: error.message };

  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function updateUserRole(userId: string, role: string) {
  if (!VALID_ROLES.includes(role)) return { error: "Perfil inválido" };

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function updateUserName(userId: string, fullName: string) {
  if (!fullName.trim()) return { error: "Nome não pode ficar vazio." };

  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function grantCompanyAccess(userId: string, companyId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_company_access")
    .insert({ user_id: userId, company_id: companyId });

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function revokeCompanyAccess(accessId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("user_company_access").delete().eq("id", accessId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

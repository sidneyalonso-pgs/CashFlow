"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

const VALID_ROLES = ["administrador", "tesouraria", "aprovador", "conciliacao", "fpa", "visualizador", "diretoria", "piloto"];

/**
 * Todas as ações desta tela mexem em contas de outros usuários (criar, trocar perfil,
 * conceder acesso a empresa) — sem essa checagem, qualquer usuário logado poderia chamar a
 * Server Action diretamente (o botão escondido na UI não protege nada) e se autopromover a
 * administrador, já que a policy de RLS de profiles permite update da própria linha.
 */
async function exigirAdministrador(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (perfil?.role !== "administrador") return { error: "Sem permissão para gerenciar usuários." };

  return { error: null };
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export async function inviteUser(formData: FormData) {
  const authCheck = await exigirAdministrador(createClient());
  if (authCheck.error) return { error: authCheck.error, tempPassword: null };

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!fullName || !email) return { error: "Preencha nome e e-mail.", tempPassword: null };

  const tempPassword = generateTempPassword();
  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) return { error: error.message, tempPassword: null };

  revalidatePath("/configuracoes/usuarios");
  return { error: null, tempPassword };
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createClient();
  const authCheck = await exigirAdministrador(supabase);
  if (authCheck.error) return { error: authCheck.error };

  if (!VALID_ROLES.includes(role)) return { error: "Perfil inválido" };

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function updateUserName(userId: string, fullName: string) {
  const supabase = createClient();
  const authCheck = await exigirAdministrador(supabase);
  if (authCheck.error) return { error: authCheck.error };

  if (!fullName.trim()) return { error: "Nome não pode ficar vazio." };

  const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function grantCompanyAccess(userId: string, companyId: string) {
  const supabase = createClient();
  const authCheck = await exigirAdministrador(supabase);
  if (authCheck.error) return { error: authCheck.error };

  const { error } = await supabase
    .from("user_company_access")
    .insert({ user_id: userId, company_id: companyId });

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

export async function revokeCompanyAccess(accessId: string) {
  const supabase = createClient();
  const authCheck = await exigirAdministrador(supabase);
  if (authCheck.error) return { error: authCheck.error };

  const { error } = await supabase.from("user_company_access").delete().eq("id", accessId);

  if (error) return { error: error.message };
  revalidatePath("/configuracoes/usuarios");
  return { error: null };
}

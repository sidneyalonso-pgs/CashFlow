"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const svc = createServiceRoleClient();
  const { data: attempt } = await svc.from("login_attempts").select("*").eq("email", email).maybeSingle();

  if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((new Date(attempt.locked_until).getTime() - Date.now()) / 60000));
    return { error: `Conta bloqueada por muitas tentativas incorretas. Tente novamente em ${minutesLeft} min.` };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const newCount = (attempt?.failed_count ?? 0) + 1;
    const shouldLock = newCount >= MAX_ATTEMPTS;

    await svc.from("login_attempts").upsert({
      email,
      failed_count: shouldLock ? 0 : newCount,
      locked_until: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });

    if (shouldLock) {
      return { error: `Muitas tentativas incorretas. Conta bloqueada por ${LOCK_MINUTES} minutos.` };
    }
    return { error: `E-mail ou senha inválidos. Tentativas restantes: ${MAX_ATTEMPTS - newCount}.` };
  }

  await svc.from("login_attempts").delete().eq("email", email);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    return { mfaRequired: true };
  }

  return { success: true };
}

export async function verifyMfaAction(code: string) {
  const supabase = createClient();
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return { error: factorsError.message };

  const factor = factorsData?.totp?.[0];
  if (!factor) return { error: "Nenhum fator de segurança encontrado para esta conta." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "Código inválido. Tente novamente." };

  return { success: true };
}

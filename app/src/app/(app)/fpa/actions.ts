"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function salvarPdd(companyId: string, periodo: string, valor: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || !["administrador", "tesouraria"].includes(prof.role)) return { error: "Sem permissão." };
  if (!/^\d{4}-\d{2}-01$/.test(periodo) || !Number.isFinite(valor)) return { error: "Dados inválidos." };
  // PDD é perda: sempre gravada como valor negativo
  const v = -Math.abs(valor);
  const { error } = await supabase
    .from("dre_ajustes_manuais")
    .upsert(
      { company_id: companyId, periodo, linha: "pdd", valor: v, updated_by: user.id, updated_at: new Date().toISOString() },
      { onConflict: "company_id,periodo,linha" }
    );
  if (error) return { error: error.message };
  revalidatePath("/fpa/dre");
  return { ok: true };
}

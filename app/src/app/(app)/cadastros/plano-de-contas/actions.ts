"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createChartAccount(formData: FormData) {
  const codigo = String(formData.get("codigo") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();

  if (!codigo || !descricao) {
    return { error: "Preencha código e descrição." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("chart_of_accounts").insert({ codigo, descricao });

  if (error) return { error: error.message };

  revalidatePath("/cadastros/plano-de-contas");
  return { error: null };
}

export async function updateChartAccount(id: string, formData: FormData) {
  const codigo = String(formData.get("codigo") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const status = String(formData.get("status") || "ativo");

  if (!codigo || !descricao) {
    return { error: "Preencha código e descrição." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("chart_of_accounts").update({ codigo, descricao, status }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/plano-de-contas");
  return { error: null };
}

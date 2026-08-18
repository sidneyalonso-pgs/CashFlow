"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companySchema } from "@/lib/validators/company";

export async function createCompany(formData: FormData) {
  const parsed = companySchema.safeParse({
    legal_name: formData.get("legal_name"),
    trade_name: formData.get("trade_name") || undefined,
    cnpj: formData.get("cnpj"),
    default_currency: formData.get("default_currency") || "BRL",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("companies").insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cadastros/empresas");
  return { error: null };
}

export async function updateCompany(companyId: string, formData: FormData) {
  const parsed = companySchema.safeParse({
    legal_name: formData.get("legal_name"),
    trade_name: formData.get("trade_name") || undefined,
    cnpj: formData.get("cnpj"),
    default_currency: formData.get("default_currency") || "BRL",
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { error } = await supabase.from("companies").update(parsed.data).eq("id", companyId);

  if (error) return { error: error.message };

  await salvarReservaOperacional(supabase, companyId, formData.get("operational_reserve"));

  revalidatePath("/cadastros/empresas");
  revalidatePath("/");
  return { error: null };
}

/**
 * Reserva operacional em update separado, e com o erro tolerado de propósito: a coluna só
 * existe depois da migration 0018, e sem isso um cadastro de empresa inteiro deixaria de
 * salvar enquanto a migration não fosse aplicada. Campo vazio grava NULL, que significa
 * "não definida" — diferente de zero, que é a decisão de não ter reserva.
 */
async function salvarReservaOperacional(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  bruto: FormDataEntryValue | null
) {
  if (bruto === null) return;
  const texto = String(bruto).trim();
  const valor = texto === "" ? null : Number(texto.replace(/\./g, "").replace(",", "."));
  if (valor !== null && !Number.isFinite(valor)) return;
  await supabase.from("companies").update({ operational_reserve: valor }).eq("id", companyId);
}

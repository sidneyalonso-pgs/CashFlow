"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Tabela = "transfers" | "revenues" | "payments";
const TABELAS: Tabela[] = ["transfers", "revenues", "payments"];

function valida(t: string): t is Tabela {
  return (TABELAS as string[]).includes(t);
}

/**
 * Marca as duas pernas com o mesmo intercompany_ref. O valor do uuid não importa — importa ser
 * igual nos dois lados, porque é isso que permite eliminar o par do bruto consolidado.
 */
export async function vincularIntercompany(
  a: { tabela: string; id: string },
  b: { tabela: string; id: string }
) {
  if (!valida(a.tabela) || !valida(b.tabela)) return { error: "Origem inválida." };
  if (a.tabela === b.tabela && a.id === b.id) return { error: "As duas pernas são o mesmo lançamento." };

  const supabase = createClient();
  const ref = randomUUID();

  for (const perna of [a, b]) {
    const { error } = await supabase
      .from(perna.tabela)
      .update({ intercompany_ref: ref })
      .eq("id", perna.id)
      .is("intercompany_ref", null);
    if (error) return { error: error.message };
  }

  revalidar();
  return { error: null };
}

export async function desvincularIntercompany(ref: string) {
  const supabase = createClient();
  for (const tabela of TABELAS) {
    const { error } = await supabase.from(tabela).update({ intercompany_ref: null }).eq("intercompany_ref", ref);
    if (error) return { error: error.message };
  }
  revalidar();
  return { error: null };
}

function revalidar() {
  revalidatePath("/conciliacao/intercompany");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/");
}

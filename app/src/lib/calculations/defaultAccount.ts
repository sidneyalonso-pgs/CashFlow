import type { createClient } from "@/lib/supabase/server";

/**
 * Conta bancária mais usada por uma empresa, para pré-selecionar o filtro assim que a empresa é
 * escolhida — em vez de abrir sempre em "Todas as contas" e obrigar a escolher de novo toda vez.
 *
 * "Mais usada" é contagem de lançamentos (pagamentos + receitas) naquela conta, não um valor
 * fixo por empresa: se um dia a Select Credit passar a operar mais pela conta B do que pela A,
 * o padrão acompanha sozinho.
 */
export async function contaPadraoDaEmpresa(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<string | null> {
  const [{ data: contas }, { data: pagamentos }, { data: receitas }] = await Promise.all([
    supabase.from("bank_accounts").select("id").eq("company_id", companyId),
    supabase.from("payments").select("paying_bank_account_id").eq("company_id", companyId).not("paying_bank_account_id", "is", null),
    supabase.from("revenues").select("receiving_bank_account_id").eq("company_id", companyId).not("receiving_bank_account_id", "is", null),
  ]);

  if (!contas || contas.length === 0) return null;
  if (contas.length === 1) return contas[0].id;

  const contagem = new Map<string, number>();
  for (const p of (pagamentos ?? []) as any[]) {
    contagem.set(p.paying_bank_account_id, (contagem.get(p.paying_bank_account_id) ?? 0) + 1);
  }
  for (const r of (receitas ?? []) as any[]) {
    contagem.set(r.receiving_bank_account_id, (contagem.get(r.receiving_bank_account_id) ?? 0) + 1);
  }

  let melhor: string | null = null;
  let maior = 0;
  for (const conta of contas) {
    const n = contagem.get(conta.id) ?? 0;
    if (n > maior) {
      maior = n;
      melhor = conta.id;
    }
  }
  return melhor;
}

/**
 * Decide se a página deve redirecionar para pré-selecionar a conta padrão da empresa.
 *
 * "todas" é a escolha explícita de ver a empresa inteira e nunca é sobrescrita. Ausência de
 * parâmetro (primeira visita) ou uma conta que não pertence mais à empresa selecionada (troca de
 * empresa mantendo o valor antigo do outro filtro) é que dispara a pré-seleção.
 */
export function precisaContaPadrao(
  rawBankAccountId: string | undefined,
  contasDaEmpresa: Set<string>
): boolean {
  if (rawBankAccountId === undefined) return true;
  if (rawBankAccountId === "todas") return false;
  return !contasDaEmpresa.has(rawBankAccountId);
}

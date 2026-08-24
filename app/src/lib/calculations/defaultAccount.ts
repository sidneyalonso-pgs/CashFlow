import type { createClient } from "@/lib/supabase/server";

/**
 * Conta bancária padrão de cada empresa, para pré-selecionar o filtro assim que a empresa é
 * escolhida — em vez de abrir sempre em "Todas as contas" e obrigar a escolher de novo toda vez.
 *
 * Fixo por empresa, e não calculado: a primeira versão tentava adivinhar pela conta com mais
 * lançamentos, mas na prática não pegou. Isso raramente muda — cada empresa realmente opera por
 * uma conta principal —, então o valor certo é simplesmente cadastrado aqui.
 *
 * Para adicionar uma empresa nova ou trocar o padrão de uma existente, edite este mapa.
 */
const CONTA_PADRAO_POR_EMPRESA: Record<string, string> = {
  "8b4b0fdb-6531-49e0-8f82-fe21d220b7ee": "d811908b-5506-4ba6-9682-61a8b8a1be05", // Pagsmile IP -> Inter - Pagsmile IP
  "afe3ce5c-f376-4e78-b627-fc03d59abe46": "d1135838-b714-4aa9-a351-6423e8b5a321", // Select Credit -> Inter - Select Credit
  "7eff6bee-8e26-4cbd-9116-121b944a4af7": "6892f524-dc48-4d67-b56b-3ee9bfa5e4e8", // Transfersmile Holding -> Inter - Transfersmile Holding
  "6e67b8c4-239c-461b-bc5d-acd1dece415b": "bc7aa58f-4a18-4269-9da1-bb0e66cb4988", // Luxpag -> Pagsmile IP - Luxpag
};

export async function contaPadraoDaEmpresa(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<string | null> {
  const fixo = CONTA_PADRAO_POR_EMPRESA[companyId];
  if (fixo) return fixo;

  // empresa sem padrão cadastrado: cai para a única conta que ela tiver, se só tiver uma
  const { data: contas } = await supabase.from("bank_accounts").select("id").eq("company_id", companyId);
  if (contas && contas.length === 1) return contas[0].id;
  return null;
}

/**
 * Decide se a página deve redirecionar para pré-selecionar a conta padrão da empresa.
 *
 * O formulário reenvia todos os campos juntos a cada mudança — inclusive o valor "todas as
 * contas" que o select de conta traz por padrão antes de qualquer escolha. Sem saber se a
 * empresa acabou de mudar, "todas" carregado de antes parecia uma escolha deliberada e nunca
 * era substituído; era por isso que a pré-seleção nunca disparava ao simplesmente abrir a tela
 * e escolher a empresa, que é o caso mais comum.
 *
 * `empresaMudou` (comparação com o hidden prev_company_id) resolve isso: só quando a empresa
 * é a mesma de antes é que "todas" conta como escolha explícita e fica intocado.
 */
export function precisaContaPadrao(
  rawBankAccountId: string | undefined,
  contasDaEmpresa: Set<string>,
  empresaMudou: boolean
): boolean {
  if (empresaMudou) return true;
  if (rawBankAccountId === undefined) return true;
  if (rawBankAccountId === "todas") return false;
  return !contasDaEmpresa.has(rawBankAccountId);
}

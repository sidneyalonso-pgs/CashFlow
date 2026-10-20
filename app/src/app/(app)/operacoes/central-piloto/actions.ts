"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  COMPONENTES,
  ORIGEM_APURADA,
  ORIGEM_PROJECAO,
  HORIZONTE_PROJECAO,
  hojeBR,
  mesesEntre,
  r2,
  totalDe,
  type CompKey,
} from "@/lib/calculations/centralPiloto";
import { planejarProjecao } from "./projecao";

type ReceitaDiaInput = {
  company_id: string;
  /** data de REFERÊNCIA: o dia a que a receita se refere (competência da DRE) */
  data: string;
  /** data de APURAÇÃO: o dia em que o dinheiro cai na conta (caixa, Receitas, Cash Flow) */
  data_apuracao: string;
  fee_pix: number | null;
  fee_ted: number | null;
  fee_onboarding: number | null;
  rem_spi: number | null;
  rem_ccme: number | null;
  bank_account_id: string | null;
};

type Svc = ReturnType<typeof createServiceRoleClient>;

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Categoria de cada tipo, pelo nome (a categoria É o tipo: Fee Pix, Fee TED, Remuneração Conta PI...). */
async function carregarCategorias(svc: Svc): Promise<{ porNome: Map<string, string>; faltando: string[] }> {
  const nomes = COMPONENTES.map((c) => c.label);
  const { data } = await svc.from("categories").select("id, name").in("name", nomes);
  const porNome = new Map<string, string>((data ?? []).map((c: any) => [c.name, c.id]));
  return { porNome, faltando: nomes.filter((n) => !porNome.has(n)) };
}

/** Tira do ar uma receita ligada à Central: remove a baixa e cancela. */
async function cancelarReceita(svc: Svc, revenueId: string) {
  await svc.from("revenue_realizations").delete().eq("revenue_id", revenueId);
  await svc.from("revenues").update({ status: "cancelada" }).eq("id", revenueId);
}

/**
 * Mantém UMA receita recebida por tipo e por dia de referência. Cada tipo tem a sua categoria; o
 * caixa (expected_date/realized_date) é a data de APURAÇÃO e a competência é a de REFERÊNCIA.
 * As receitas que caem juntas no banco (mesma apuração e banco) são agrupadas na conciliação.
 */
async function sincronizarReceitasDoDia(
  svc: Svc,
  companyId: string,
  referencia: string,
  apuracao: string,
  bankId: string | null,
  valores: Record<CompKey, number>,
  categorias: Map<string, string>
): Promise<{ error?: string }> {
  const { data: existentes } = await svc
    .from("revenues")
    .select("id, componente")
    .eq("company_id", companyId)
    .eq("origem", ORIGEM_APURADA)
    .eq("competence_date", referencia)
    .is("deleted_at", null);
  const porComponente = new Map<string, string>();
  for (const r of (existentes ?? []) as any[]) if (r.componente && !porComponente.has(r.componente)) porComponente.set(r.componente, r.id);

  for (const c of COMPONENTES) {
    const valor = valores[c.key];
    const idExistente = porComponente.get(c.key) ?? null;

    if (valor <= 0 || !bankId) {
      if (idExistente) await cancelarReceita(svc, idExistente);
      continue;
    }

    const campos = {
      description: `${c.label} — ${dataBR(apuracao)} (ref. ${dataBR(referencia)})`,
      expected_amount: valor,
      realized_amount: valor,
      expected_date: apuracao,
      realized_date: apuracao,
      competence_date: referencia,
      receiving_bank_account_id: bankId,
      category_id: categorias.get(c.label) ?? null,
      status: "recebida",
      origem: ORIGEM_APURADA,
      componente: c.key,
    };

    let revenueId = idExistente;
    if (revenueId) {
      const { error } = await svc.from("revenues").update({ ...campos, deleted_at: null }).eq("id", revenueId);
      if (error) return { error: `${c.label}: ${error.message}` };
    } else {
      const { data: rev, error } = await svc
        .from("revenues")
        .insert({ company_id: companyId, probability_pct: 100, ...campos })
        .select("id")
        .single();
      if (error || !rev) return { error: `${c.label}: ${error?.message ?? "não foi possível criar"}` };
      revenueId = rev.id as string;
    }

    const { error: realErr } = await svc
      .from("revenue_realizations")
      .upsert({ revenue_id: revenueId, amount: valor, received_at: apuracao, bank_account_id: bankId }, { onConflict: "revenue_id" });
    if (realErr) return { error: `${c.label}: ${realErr.message}` };
  }
  return {};
}

/**
 * Recalcula a projeção do restante do mês de refData: apaga as projeções daquele mês de referência
 * e cria de novo uma receita ESTIMADA por tipo e por dia de referência (média das 5 últimas
 * apurações), com o caixa no primeiro dia útil seguinte, no banco da última apuração.
 * Nunca cria baixa: projeção é só previsão.
 */
async function recalcularProjecao(
  svc: Svc,
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refData: string,
  categorias: Map<string, string>
) {
  const mesIni = refData.slice(0, 7);
  // do mês de refData até o horizonte: todos os meses são refeitos com a média atual
  for (const mesRef of mesesEntre(mesIni, HORIZONTE_PROJECAO)) {
    // apaga pelo mês de REFERÊNCIA, não pela data do caixa: a referência do fim do mês cai no mês seguinte
    await svc.from("revenues").delete().eq("company_id", companyId).eq("origem", ORIGEM_PROJECAO).eq("origem_ref", mesRef);

    const plano = await planejarProjecao(supabase, companyId, mesRef === mesIni ? refData : `${mesRef}-01`, hojeBR());
    if (!plano) continue;

    const linhas = plano.dias.flatMap((dia) =>
      COMPONENTES.filter((c) => dia.valores[c.key] > 0).map((c) => ({
        company_id: companyId,
        description: `Projeção ${c.label} — ${dataBR(dia.apuracao)} (ref. ${dataBR(dia.referencia)})`,
        expected_amount: dia.valores[c.key],
        expected_date: dia.apuracao,
        competence_date: dia.referencia,
        componente: c.key,
        receiving_bank_account_id: plano.bankAccountId,
        category_id: categorias.get(c.label) ?? null,
        probability_pct: 100,
        status: "estimada",
        origem: ORIGEM_PROJECAO,
        origem_ref: mesRef,
        notes: "Média por tipo das 5 últimas apurações da Central Piloto, no primeiro dia útil seguinte à referência.",
      }))
    );
    if (linhas.length > 0) await svc.from("revenues").insert(linhas);
  }
}

/** Refaz a projeção de hoje até o horizonte (dezembro), sem precisar lançar um dia novo. */
export async function recalcularProjecaoCentral(companyId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!perfil || !["administrador", "tesouraria"].includes(perfil.role as string)) return { error: "Sem permissão." };
  if (!companyId) return { error: "Empresa não informada." };

  const svc = createServiceRoleClient();
  const { porNome, faltando } = await carregarCategorias(svc);
  if (faltando.length > 0) return { error: `Categorias não encontradas: ${faltando.join(", ")}.` };

  await recalcularProjecao(svc, supabase, companyId, hojeBR(), porNome);
  revalidatePath("/operacoes/central-piloto");
  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/fpa/dre");
  return { error: null };
}

/**
 * Salva a receita de um dia de REFERÊNCIA da Central Piloto: Fee Pix, Fee TED, Fee Onboarding,
 * Remuneração Conta PI, Remuneração CCME, data de APURAÇÃO e banco de recebimento. Cada tipo vira
 * uma receita recebida na sua categoria (Receitas e Cash Flow, no dia em que o dinheiro cai na
 * conta), e o restante do mês é projetado. Na conciliação, as receitas que caíram juntas aparecem
 * numa linha só, com a soma.
 *
 * A escrita em `revenues` usa o client de service role de propósito: o papel "piloto" só tem
 * permissão de escrita na tabela da Central Piloto (RLS), não em Receitas — é este server action,
 * e só ele, que faz a ponte.
 */
export async function saveReceitaDia(input: ReceitaDiaInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!perfil || !["administrador", "tesouraria", "piloto"].includes(perfil.role as string)) {
    return { error: "Sem permissão para lançar na Central Piloto." };
  }

  if (!input.company_id || !ISO.test(input.data)) return { error: "Empresa e data de referência são obrigatórios." };
  if (!ISO.test(input.data_apuracao)) return { error: "Informe a data de apuração (o dia em que o dinheiro caiu na conta)." };
  const hoje = hojeBR();
  // receita lançada é dinheiro recebido: nenhuma das duas datas pode ser futura (o futuro é projeção)
  if (input.data > hoje || input.data_apuracao > hoje) {
    return { error: "Não é possível lançar em data futura. O restante do mês é projetado automaticamente." };
  }
  if (input.data_apuracao < input.data) return { error: "A data de apuração não pode ser anterior à data de referência." };

  const valores = {} as Record<CompKey, number>;
  for (const c of COMPONENTES) {
    const v = Number(input[c.key] ?? 0);
    if (!Number.isFinite(v) || v < 0) return { error: `${c.label}: valor inválido.` };
    valores[c.key] = r2(v);
  }
  const total = totalDe(valores);
  if (total > 0 && !input.bank_account_id) return { error: "Escolha o banco de recebimento." };

  const svc = createServiceRoleClient();
  const { porNome, faltando } = await carregarCategorias(svc);
  if (faltando.length > 0) return { error: `Categorias não encontradas: ${faltando.join(", ")}.` };

  const { data: existing } = await supabase
    .from("salva_guarda_diario")
    .select("id")
    .eq("company_id", input.company_id)
    .eq("data", input.data)
    .maybeSingle();

  const linha = {
    company_id: input.company_id,
    data: input.data,
    data_apuracao: input.data_apuracao,
    fee_pix: valores.fee_pix || null,
    fee_ted: valores.fee_ted || null,
    fee_onboarding: valores.fee_onboarding || null,
    remuneracao_spi: valores.rem_spi || null,
    remuneracao_ccme: valores.rem_ccme || null,
    // campos antigos mantidos em dia: o relatório diário e o histórico continuam lendo deles
    fee: r2(valores.fee_pix + valores.fee_ted + valores.fee_onboarding) || null,
    total_apurado: total,
    receipt_bank_account_id: input.bank_account_id,
    fee_bank_account_id: input.bank_account_id,
    remuneracao_spi_bank_account_id: input.bank_account_id,
    remuneracao_ccme_bank_account_id: input.bank_account_id,
    revenue_id: null as string | null,
    fee_revenue_id: null,
    remuneracao_spi_revenue_id: null,
    remuneracao_ccme_revenue_id: null,
    updated_by: user.id,
  };

  const { error } = existing
    ? await supabase.from("salva_guarda_diario").update(linha).eq("id", existing.id)
    : await supabase.from("salva_guarda_diario").insert({ ...linha, created_by: user.id });
  if (error) {
    return {
      error: /column|schema cache/i.test(error.message)
        ? "As migrations 0030, 0031 e 0032 ainda não foram aplicadas no banco."
        : error.message,
    };
  }

  const resultado = await sincronizarReceitasDoDia(svc, input.company_id, input.data, input.data_apuracao, input.bank_account_id, valores, porNome);
  if (resultado.error) return { error: resultado.error };

  await recalcularProjecao(svc, supabase, input.company_id, input.data, porNome);

  revalidatePath("/operacoes/central-piloto");
  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/fpa/dre");
  revalidatePath("/conciliacao");
  return { error: null };
}

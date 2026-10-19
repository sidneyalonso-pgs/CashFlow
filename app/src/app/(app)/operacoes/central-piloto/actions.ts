"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  CATEGORIA_CABECALHO,
  COMPONENTES,
  ORIGEM_APURADA,
  ORIGEM_PROJECAO,
  hojeBR,
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

/** Categorias de cada tipo + a da receita única, pelo nome. */
async function carregarCategorias(svc: Svc): Promise<{ porNome: Map<string, string>; faltando: string[] }> {
  const nomes = [...COMPONENTES.map((c) => c.label), CATEGORIA_CABECALHO];
  const { data } = await svc.from("categories").select("id, name").in("name", nomes);
  const porNome = new Map<string, string>((data ?? []).map((c: any) => [c.name, c.id]));
  return { porNome, faltando: nomes.filter((n) => !porNome.has(n)) };
}

/** Tira do ar uma receita ligada à Central (cancela e remove a baixa e a composição). */
async function cancelarReceita(svc: Svc, revenueId: string) {
  await svc.from("revenue_realizations").delete().eq("revenue_id", revenueId);
  await svc.from("revenue_components").delete().eq("revenue_id", revenueId);
  await svc.from("revenues").update({ status: "cancelada" }).eq("id", revenueId);
}

function descricaoDaApuracao(apuracao: string, referencias: string[]) {
  const ordenadas = [...referencias].sort();
  const ref =
    ordenadas.length === 0
      ? ""
      : ordenadas.length === 1
      ? ` (ref. ${dataBR(ordenadas[0])})`
      : ` (ref. ${dataBR(ordenadas[0])} a ${dataBR(ordenadas[ordenadas.length - 1])})`;
  return `Receita Salva-Guarda — ${dataBR(apuracao)}${ref}`;
}

/**
 * Mantém UMA receita recebida por data de apuração + banco: a soma de todas as linhas (dias de
 * referência) que caíram juntas na conta. É essa receita que casa 1 a 1 com o crédito do extrato.
 * A composição guarda cada parte com o seu dia de referência (a DRE usa a competência).
 * Sem nenhuma linha com valor naquela apuração e banco, a receita é cancelada.
 */
async function sincronizarGrupo(
  svc: Svc,
  companyId: string,
  apuracao: string,
  bankId: string | null,
  categorias: Map<string, string>
): Promise<{ error?: string }> {
  if (!bankId) return {};
  const { data: linhas } = await svc
    .from("salva_guarda_diario")
    .select("id, data, fee_pix, fee_ted, fee_onboarding, remuneracao_spi, remuneracao_ccme, revenue_id")
    .eq("company_id", companyId)
    .eq("data_apuracao", apuracao)
    .eq("receipt_bank_account_id", bankId);

  const comValor = ((linhas ?? []) as any[]).filter(
    (l) => totalDe({ fee_pix: l.fee_pix, fee_ted: l.fee_ted, fee_onboarding: l.fee_onboarding, rem_spi: l.remuneracao_spi, rem_ccme: l.remuneracao_ccme }) > 0
  );

  // a receita do grupo: a que alguma linha já aponta, ou a que existir para essa apuração e banco
  let revenueId: string | null = ((linhas ?? []) as any[]).map((l) => l.revenue_id).find(Boolean) ?? null;
  if (!revenueId) {
    const { data: achada } = await svc
      .from("revenues")
      .select("id")
      .eq("company_id", companyId)
      .eq("origem", ORIGEM_APURADA)
      .eq("expected_date", apuracao)
      .eq("receiving_bank_account_id", bankId)
      .neq("status", "cancelada")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    revenueId = achada?.id ?? null;
  }

  const partes = comValor.flatMap((l) =>
    COMPONENTES.map((c) => {
      const campo = c.key === "rem_spi" ? l.remuneracao_spi : c.key === "rem_ccme" ? l.remuneracao_ccme : l[c.key];
      return { referencia: l.data as string, componente: c.key as CompKey, label: c.label, amount: r2(Number(campo) || 0) };
    }).filter((p) => p.amount > 0)
  );
  const total = r2(partes.reduce((s, p) => s + p.amount, 0));

  if (total <= 0) {
    if (revenueId) await cancelarReceita(svc, revenueId);
    await svc.from("salva_guarda_diario").update({ revenue_id: null }).eq("company_id", companyId).eq("data_apuracao", apuracao).eq("receipt_bank_account_id", bankId);
    return {};
  }

  const catCab = categorias.get(CATEGORIA_CABECALHO)!;
  const descricao = descricaoDaApuracao(apuracao, comValor.map((l) => l.data));

  if (revenueId) {
    const { error } = await svc
      .from("revenues")
      .update({
        description: descricao,
        expected_amount: total,
        realized_amount: total,
        expected_date: apuracao,
        realized_date: apuracao,
        receiving_bank_account_id: bankId,
        category_id: catCab,
        status: "recebida",
        origem: ORIGEM_APURADA,
        deleted_at: null,
      })
      .eq("id", revenueId);
    if (error) return { error: `Receita: ${error.message}` };
    const { error: realErr } = await svc
      .from("revenue_realizations")
      .upsert({ revenue_id: revenueId, amount: total, received_at: apuracao, bank_account_id: bankId }, { onConflict: "revenue_id" });
    if (realErr) return { error: `Receita: ${realErr.message}` };
  } else {
    const { data: rev, error } = await svc
      .from("revenues")
      .insert({
        company_id: companyId,
        description: descricao,
        expected_amount: total,
        realized_amount: total,
        expected_date: apuracao,
        realized_date: apuracao,
        receiving_bank_account_id: bankId,
        category_id: catCab,
        probability_pct: 100,
        status: "recebida",
        origem: ORIGEM_APURADA,
      })
      .select("id")
      .single();
    if (error || !rev) return { error: `Receita: ${error?.message ?? "não foi possível criar"}` };
    revenueId = rev.id as string;
    const { error: realErr } = await svc
      .from("revenue_realizations")
      .insert({ revenue_id: revenueId, amount: total, received_at: apuracao, bank_account_id: bankId });
    if (realErr) return { error: `Receita: ${realErr.message}` };
  }

  await svc.from("revenue_components").delete().eq("revenue_id", revenueId);
  const { error: compErr } = await svc.from("revenue_components").insert(
    partes.map((p) => ({
      revenue_id: revenueId,
      componente: p.componente,
      category_id: categorias.get(p.label) ?? null,
      amount: p.amount,
      data_referencia: p.referencia,
    }))
  );
  if (compErr) return { error: `Composição: ${compErr.message}` };

  await svc
    .from("salva_guarda_diario")
    .update({ revenue_id: revenueId })
    .eq("company_id", companyId)
    .eq("data_apuracao", apuracao)
    .eq("receipt_bank_account_id", bankId)
    .in("id", comValor.map((l) => l.id));
  return {};
}

/**
 * Recalcula a projeção do restante do mês de refData: apaga as projeções daquele mês de
 * referência e cria de novo UMA receita ESTIMADA por data de apuração (soma das referências que
 * vão cair juntas), no banco da última apuração. Nunca cria baixa: projeção é só previsão.
 */
async function recalcularProjecao(
  svc: Svc,
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refData: string,
  categorias: Map<string, string>
) {
  const mesRef = refData.slice(0, 7);

  // apaga pelo mês de REFERÊNCIA, não pela data do caixa: a referência do fim do mês cai no mês seguinte
  await svc.from("revenues").delete().eq("company_id", companyId).eq("origem", ORIGEM_PROJECAO).eq("origem_ref", mesRef);

  const plano = await planejarProjecao(supabase, companyId, refData, hojeBR());
  if (!plano) return;

  const catCab = categorias.get(CATEGORIA_CABECALHO) ?? null;
  const { data: criadas, error } = await svc
    .from("revenues")
    .insert(
      plano.porApuracao.map((g) => ({
        company_id: companyId,
        description: `Projeção Salva-Guarda — ${dataBR(g.apuracao)}`,
        expected_amount: g.total,
        expected_date: g.apuracao,
        receiving_bank_account_id: plano.bankAccountId,
        category_id: catCab,
        probability_pct: 100,
        status: "estimada",
        origem: ORIGEM_PROJECAO,
        origem_ref: mesRef,
        notes: "Média por tipo das 5 últimas apurações da Central Piloto, no primeiro dia útil seguinte à referência.",
      }))
    )
    .select("id, expected_date");
  if (error || !criadas) return;

  const idPorApuracao = new Map<string, string>((criadas as any[]).map((r) => [r.expected_date, r.id]));
  const linhas = plano.porApuracao.flatMap((g) =>
    g.dias.flatMap((dia) =>
      COMPONENTES.filter((c) => dia.valores[c.key] > 0).map((c) => ({
        revenue_id: idPorApuracao.get(g.apuracao)!,
        componente: c.key,
        category_id: categorias.get(c.label) ?? null,
        amount: dia.valores[c.key],
        data_referencia: dia.referencia,
      }))
    )
  );
  if (linhas.length > 0) await svc.from("revenue_components").insert(linhas);
}

/**
 * Salva a receita de um dia de REFERÊNCIA da Central Piloto: Fee PIX, Fee TED, Fee Onboarding,
 * Remuneração SPI, Remuneração CCME, data de APURAÇÃO e banco de recebimento. O sistema soma o
 * Total apurado, lança UMA receita recebida por data de apuração e banco (Cash Flow e Receitas,
 * no dia em que o dinheiro cai na conta) e recalcula a projeção do restante do mês.
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
    .select("*")
    .eq("company_id", input.company_id)
    .eq("data", input.data)
    .maybeSingle();

  // se a linha já existia, o grupo antigo (apuração e banco de antes) também precisa ser refeito
  const grupoAntigo =
    existing && (existing.data_apuracao || existing.data) && (existing.receipt_bank_account_id ?? existing.fee_bank_account_id)
      ? { apuracao: (existing.data_apuracao ?? existing.data) as string, banco: (existing.receipt_bank_account_id ?? existing.fee_bank_account_id) as string }
      : null;

  // dia lançado no modelo antigo (três receitas separadas): vira parte da receita única. Se alguma
  // já foi conciliada com o extrato, não mexe — desfazer a conciliação é decisão de quem concilia.
  const idsAntigos = [existing?.fee_revenue_id, existing?.remuneracao_spi_revenue_id, existing?.remuneracao_ccme_revenue_id].filter(Boolean) as string[];
  if (idsAntigos.length > 0) {
    const { data: antigas } = await svc.from("revenues").select("id, reconciliation_status").in("id", idsAntigos);
    if ((antigas ?? []).some((r: any) => r.reconciliation_status && r.reconciliation_status !== "pendente")) {
      return { error: "Este dia tem receitas antigas já conciliadas com o extrato. Desfaça a conciliação em Conciliação antes de relançar." };
    }
    await svc.from("revenue_realizations").delete().in("revenue_id", idsAntigos);
    await svc.from("revenues").update({ status: "cancelada", deleted_at: new Date().toISOString() }).in("id", idsAntigos);
  }

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
  // a receita do grupo é (re)ligada pela sincronização. Só mantém o vínculo antigo se a linha continua
  // no mesmo grupo (apuração e banco); senão ele apontaria para a receita do grupo errado.
  const mesmoGrupo = !!grupoAntigo && grupoAntigo.apuracao === input.data_apuracao && grupoAntigo.banco === input.bank_account_id;
  if (existing?.revenue_id && mesmoGrupo) linha.revenue_id = existing.revenue_id;

  const { error } = existing
    ? await supabase.from("salva_guarda_diario").update(linha).eq("id", existing.id)
    : await supabase.from("salva_guarda_diario").insert({ ...linha, created_by: user.id });
  if (error) {
    return {
      error: /column|schema cache/i.test(error.message)
        ? "As migrations 0030 e 0031 ainda não foram aplicadas no banco."
        : error.message,
    };
  }

  // refaz a receita do grupo novo e, se a linha mudou de apuração ou banco, a do grupo antigo
  const resultado = await sincronizarGrupo(svc, input.company_id, input.data_apuracao, input.bank_account_id, porNome);
  if (resultado.error) return { error: resultado.error };
  if (grupoAntigo && (grupoAntigo.apuracao !== input.data_apuracao || grupoAntigo.banco !== input.bank_account_id)) {
    const r2g = await sincronizarGrupo(svc, input.company_id, grupoAntigo.apuracao, grupoAntigo.banco, porNome);
    if (r2g.error) return { error: r2g.error };
  }

  await recalcularProjecao(svc, supabase, input.company_id, input.data, porNome);

  revalidatePath("/operacoes/central-piloto");
  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/fpa/dre");
  return { error: null };
}

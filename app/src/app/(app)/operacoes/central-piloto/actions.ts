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
  ultimoDiaDoMes,
  type CompKey,
} from "@/lib/calculations/centralPiloto";
import { planejarProjecao } from "./projecao";

type ReceitaDiaInput = {
  company_id: string;
  data: string;
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

/** Categorias de cada tipo + a da receita única, pelo nome. */
async function carregarCategorias(svc: Svc): Promise<{ porNome: Map<string, string>; faltando: string[] }> {
  const nomes = [...COMPONENTES.map((c) => c.label), CATEGORIA_CABECALHO];
  const { data } = await svc.from("categories").select("id, name").in("name", nomes);
  const porNome = new Map<string, string>((data ?? []).map((c: any) => [c.name, c.id]));
  return { porNome, faltando: nomes.filter((n) => !porNome.has(n)) };
}

async function gravarComponentes(svc: Svc, revenueId: string, valores: Record<CompKey, number>, categorias: Map<string, string>) {
  await svc.from("revenue_components").delete().eq("revenue_id", revenueId);
  const linhas = COMPONENTES.filter((c) => valores[c.key] > 0).map((c) => ({
    revenue_id: revenueId,
    componente: c.key,
    category_id: categorias.get(c.label) ?? null,
    amount: valores[c.key],
  }));
  if (linhas.length > 0) await svc.from("revenue_components").insert(linhas);
}

/** Tira do ar uma receita ligada à Central (cancela e remove a baixa e a composição). */
async function cancelarReceita(svc: Svc, revenueId: string) {
  await svc.from("revenue_realizations").delete().eq("revenue_id", revenueId);
  await svc.from("revenue_components").delete().eq("revenue_id", revenueId);
  await svc.from("revenues").update({ status: "cancelada" }).eq("id", revenueId);
}

/**
 * Recalcula a projeção do restante do mês: apaga as projeções do mês e cria de novo uma receita
 * ESTIMADA por dia útil (média por tipo das 5 últimas apurações), no banco da última apuração.
 * Nunca cria baixa: projeção é só previsão, nunca dinheiro recebido.
 */
async function recalcularProjecao(
  svc: Svc,
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refData: string,
  categorias: Map<string, string>
) {
  const inicioMes = refData.slice(0, 8) + "01";
  const fimMes = ultimoDiaDoMes(refData);

  // projeções antigas do mês saem sempre; só então entram as novas
  const { data: antigas } = await svc
    .from("revenues")
    .select("id")
    .eq("company_id", companyId)
    .eq("origem", ORIGEM_PROJECAO)
    .gte("expected_date", inicioMes)
    .lte("expected_date", fimMes);
  const ids = (antigas ?? []).map((r: any) => r.id);
  if (ids.length > 0) await svc.from("revenues").delete().in("id", ids);

  const plano = await planejarProjecao(supabase, companyId, refData, hojeBR());
  if (!plano) return;

  const catCab = categorias.get(CATEGORIA_CABECALHO) ?? null;
  const { data: criadas, error } = await svc
    .from("revenues")
    .insert(
      plano.dias.map((dia) => ({
        company_id: companyId,
        description: `Projeção Salva-Guarda — ${dataBR(dia)}`,
        expected_amount: plano.total,
        expected_date: dia,
        receiving_bank_account_id: plano.bankAccountId,
        category_id: catCab,
        probability_pct: 100,
        status: "estimada",
        origem: ORIGEM_PROJECAO,
        notes: "Média por tipo das 5 últimas apurações da Central Piloto.",
      }))
    )
    .select("id");
  if (error || !criadas) return;

  const linhas = (criadas as any[]).flatMap((r) =>
    COMPONENTES.filter((c) => plano.medias[c.key] > 0).map((c) => ({
      revenue_id: r.id,
      componente: c.key,
      category_id: categorias.get(c.label) ?? null,
      amount: plano.medias[c.key],
    }))
  );
  if (linhas.length > 0) await svc.from("revenue_components").insert(linhas);
}

/**
 * Salva a receita do dia da Central Piloto: Fee PIX, Fee TED, Fee Onboarding, Remuneração SPI e
 * Remuneração CCME + banco de recebimento. O sistema soma o Total apurado e lança UMA receita
 * já recebida (no Cash Flow e em Receitas, no banco escolhido) com a composição por tipo, e
 * recalcula a projeção do restante do mês.
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

  if (!input.company_id || !/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return { error: "Empresa e data são obrigatórios." };
  // receita lançada é dinheiro recebido: não existe recebimento em data futura (o futuro é projeção)
  if (input.data > hojeBR()) return { error: "Não é possível lançar receita em data futura. O restante do mês é projetado automaticamente." };

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
  const catCab = porNome.get(CATEGORIA_CABECALHO)!;

  const { data: existing } = await supabase
    .from("salva_guarda_diario")
    .select("*")
    .eq("company_id", input.company_id)
    .eq("data", input.data)
    .maybeSingle();

  // dia lançado no modelo antigo (três receitas separadas): vira uma só. Se alguma já foi
  // conciliada com o extrato, não mexe — desfazer a conciliação é decisão de quem concilia.
  const idsAntigos = [existing?.fee_revenue_id, existing?.remuneracao_spi_revenue_id, existing?.remuneracao_ccme_revenue_id].filter(Boolean) as string[];
  if (idsAntigos.length > 0) {
    const { data: antigas } = await svc.from("revenues").select("id, reconciliation_status").in("id", idsAntigos);
    if ((antigas ?? []).some((r: any) => r.reconciliation_status && r.reconciliation_status !== "pendente")) {
      return { error: "Este dia tem receitas antigas já conciliadas com o extrato. Desfaça a conciliação em Conciliação antes de relançar." };
    }
    await svc.from("revenue_realizations").delete().in("revenue_id", idsAntigos);
    await svc.from("revenues").update({ status: "cancelada", deleted_at: new Date().toISOString() }).in("id", idsAntigos);
  }

  const dia = dataBR(input.data);
  let revenueId: string | null = existing?.revenue_id ?? null;

  if (total <= 0) {
    if (revenueId) await cancelarReceita(svc, revenueId);
  } else if (revenueId) {
    const { error } = await svc
      .from("revenues")
      .update({
        description: `Receita Salva-Guarda — ${dia}`,
        expected_amount: total,
        realized_amount: total,
        expected_date: input.data,
        realized_date: input.data,
        receiving_bank_account_id: input.bank_account_id,
        category_id: catCab,
        status: "recebida",
        origem: ORIGEM_APURADA,
        deleted_at: null,
      })
      .eq("id", revenueId);
    if (error) return { error: `Receita: ${error.message}` };
    const { error: realErr } = await svc
      .from("revenue_realizations")
      .upsert({ revenue_id: revenueId, amount: total, received_at: input.data, bank_account_id: input.bank_account_id }, { onConflict: "revenue_id" });
    if (realErr) return { error: `Receita: ${realErr.message}` };
  } else {
    const { data: rev, error } = await svc
      .from("revenues")
      .insert({
        company_id: input.company_id,
        description: `Receita Salva-Guarda — ${dia}`,
        expected_amount: total,
        realized_amount: total,
        expected_date: input.data,
        realized_date: input.data,
        receiving_bank_account_id: input.bank_account_id,
        category_id: catCab,
        probability_pct: 100,
        status: "recebida",
        origem: ORIGEM_APURADA,
      })
      .select("id")
      .single();
    if (error || !rev) return { error: `Receita: ${error?.message ?? "não foi possível criar"}` };
    revenueId = rev.id;
    const { error: realErr } = await svc
      .from("revenue_realizations")
      .insert({ revenue_id: rev.id, amount: total, received_at: input.data, bank_account_id: input.bank_account_id });
    if (realErr) return { error: `Receita: ${realErr.message}` };
  }

  if (revenueId && total > 0) await gravarComponentes(svc, revenueId, valores, porNome);

  const linha = {
    company_id: input.company_id,
    data: input.data,
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
    revenue_id: total > 0 ? revenueId : null,
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
        ? "A migration 0030 ainda não foi aplicada no banco."
        : error.message,
    };
  }

  await recalcularProjecao(svc, supabase, input.company_id, input.data, porNome);

  revalidatePath("/operacoes/central-piloto");
  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/fpa/dre");
  return { error: null };
}

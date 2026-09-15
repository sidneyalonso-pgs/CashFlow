"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAccountOutflowsOnDay } from "@/lib/calculations/accountBalance";

type SalvaGuardaInput = {
  company_id: string;
  data: string;
  saldo_em_conta: number | null;
  fee: number | null;
  remuneracao_spi: number | null;
  bank_account_id: string | null;
  saldo_4111: number | null;
  taxa_ccme: number | null;
  deixar_na_ccme: number | null;
};

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaAnterior(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function upsertLinkedRevenue(
  svc: ReturnType<typeof createServiceRoleClient>,
  opts: {
    existingRevenueId: string | null;
    companyId: string;
    categoryId: string | null;
    description: string;
    amount: number | null;
    date: string;
    bankAccountId: string | null;
  }
): Promise<{ revenueId: string | null; error?: string }> {
  const { existingRevenueId, companyId, categoryId, description, amount, date, bankAccountId } = opts;

  // valor zerado/apagado: cancela a receita ligada em vez de deixar órfã com valor velho
  if (!amount || amount <= 0) {
    if (existingRevenueId) {
      await svc.from("revenues").update({ status: "cancelada" }).eq("id", existingRevenueId);
    }
    return { revenueId: existingRevenueId };
  }

  if (existingRevenueId) {
    const { error } = await svc
      .from("revenues")
      .update({
        description,
        expected_amount: amount,
        realized_amount: amount,
        expected_date: date,
        realized_date: date,
        receiving_bank_account_id: bankAccountId,
        category_id: categoryId,
        status: "recebida",
      })
      .eq("id", existingRevenueId);
    if (error) return { revenueId: existingRevenueId, error: error.message };

    const { error: realErr } = await svc
      .from("revenue_realizations")
      .upsert({ revenue_id: existingRevenueId, amount, received_at: date, bank_account_id: bankAccountId }, { onConflict: "revenue_id" });
    if (realErr) return { revenueId: existingRevenueId, error: realErr.message };
    return { revenueId: existingRevenueId };
  }

  const { data: rev, error } = await svc
    .from("revenues")
    .insert({
      company_id: companyId,
      description,
      expected_amount: amount,
      realized_amount: amount,
      expected_date: date,
      realized_date: date,
      receiving_bank_account_id: bankAccountId,
      category_id: categoryId,
      probability_pct: 100,
      status: "recebida",
    })
    .select("id")
    .single();
  if (error) return { revenueId: null, error: error.message };

  const { error: realErr } = await svc
    .from("revenue_realizations")
    .insert({ revenue_id: rev.id, amount, received_at: date, bank_account_id: bankAccountId });
  if (realErr) return { revenueId: rev.id, error: realErr.message };

  return { revenueId: rev.id };
}

/**
 * Salva o dia da Salva-Guarda e reflete Fee / Remuneração SPI / Remuneração CCME em Receitas
 * automaticamente — cada um vira (ou atualiza) uma receita já recebida, no banco escolhido.
 * Remuneração CCME não vem do formulário: é calculada aqui a partir do dia anterior.
 * A escrita em `revenues`/`revenue_realizations` usa o client de service role de propósito: o
 * papel "piloto" só tem permissão de escrita na própria tabela da Central Piloto (RLS), não em
 * Receitas em geral — é este server action, e só ele, que faz a ponte.
 */
export async function saveSalvaGuardaDay(input: SalvaGuardaInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!perfil || !["administrador", "tesouraria", "piloto"].includes(perfil.role as string)) {
    return { error: "Sem permissão para lançar na Central Piloto." };
  }

  if (!input.company_id || !input.data) return { error: "Empresa e data são obrigatórios." };

  const svc = createServiceRoleClient();
  const { data: categoria } = await svc.from("categories").select("id").eq("name", "Receitas Financeiras").maybeSingle();
  const categoryId = categoria?.id ?? null;

  const { data: existing } = await supabase
    .from("salva_guarda_diario")
    .select("id, fee_revenue_id, remuneracao_spi_revenue_id, remuneracao_ccme_revenue_id")
    .eq("company_id", input.company_id)
    .eq("data", input.data)
    .maybeSingle();

  // Remuneração CCME não é digitada: acumula sobre o que ficou custodiado no dia ANTERIOR
  // (Valor Aplicado Salva-Guarda + Deixar na CCME do dia de ontem) × Taxa CCME de ontem —
  // fórmula confirmada na planilha original (G = (L_ontem + F_ontem) * J_ontem).
  const { data: ontem } = await supabase
    .from("salva_guarda_diario")
    .select("saldo_em_conta, deixar_na_ccme, taxa_ccme")
    .eq("company_id", input.company_id)
    .eq("data", diaAnterior(input.data))
    .maybeSingle();

  const valorAplicadoOntem = ontem?.saldo_em_conta != null ? Number(ontem.saldo_em_conta) - 80000 : null;
  const remuneracaoCcme =
    valorAplicadoOntem != null && ontem?.deixar_na_ccme != null
      ? (valorAplicadoOntem + Number(ontem.deixar_na_ccme)) * Number(ontem.taxa_ccme ?? 0.0005166)
      : null;

  // Retiradas também não é digitada: soma real das saídas da conta Administrativo/SPB naquele dia
  const { data: administrativoAccount } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("company_id", input.company_id)
    .or("nickname.ilike.%administrativo%,nickname.ilike.%SPB%")
    .limit(1)
    .maybeSingle();
  const retiradas = administrativoAccount
    ? await getAccountOutflowsOnDay(supabase, administrativoAccount.id, input.company_id, input.data)
    : null;

  const dia = dataBR(input.data);

  const feeResult = await upsertLinkedRevenue(svc, {
    existingRevenueId: existing?.fee_revenue_id ?? null,
    companyId: input.company_id,
    categoryId,
    description: `Fee — Salva-Guarda (${dia})`,
    amount: input.fee,
    date: input.data,
    bankAccountId: input.bank_account_id,
  });
  if (feeResult.error) return { error: `Fee: ${feeResult.error}` };

  const spiResult = await upsertLinkedRevenue(svc, {
    existingRevenueId: existing?.remuneracao_spi_revenue_id ?? null,
    companyId: input.company_id,
    categoryId,
    description: `Remuneração SPI — Salva-Guarda (${dia})`,
    amount: input.remuneracao_spi,
    date: input.data,
    bankAccountId: input.bank_account_id,
  });
  if (spiResult.error) return { error: `Remuneração SPI: ${spiResult.error}` };

  const ccmeResult = await upsertLinkedRevenue(svc, {
    existingRevenueId: existing?.remuneracao_ccme_revenue_id ?? null,
    companyId: input.company_id,
    categoryId,
    description: `Remuneração CCME — Salva-Guarda (${dia})`,
    amount: remuneracaoCcme,
    date: input.data,
    bankAccountId: input.bank_account_id,
  });
  if (ccmeResult.error) return { error: `Remuneração CCME: ${ccmeResult.error}` };

  const row = {
    company_id: input.company_id,
    data: input.data,
    saldo_em_conta: input.saldo_em_conta,
    fee: input.fee,
    fee_bank_account_id: input.bank_account_id,
    fee_revenue_id: feeResult.revenueId,
    remuneracao_spi: input.remuneracao_spi,
    remuneracao_spi_bank_account_id: input.bank_account_id,
    remuneracao_spi_revenue_id: spiResult.revenueId,
    remuneracao_ccme: remuneracaoCcme,
    remuneracao_ccme_bank_account_id: input.bank_account_id,
    remuneracao_ccme_revenue_id: ccmeResult.revenueId,
    saldo_4111: input.saldo_4111,
    taxa_ccme: input.taxa_ccme ?? 0.0005166,
    retiradas,
    deixar_na_ccme: input.deixar_na_ccme,
    updated_by: user.id,
  };

  const { error } = existing
    ? await supabase.from("salva_guarda_diario").update(row).eq("id", existing.id)
    : await supabase.from("salva_guarda_diario").insert({ ...row, created_by: user.id });

  if (error) return { error: error.message };

  revalidatePath("/operacoes/central-piloto");
  revalidatePath("/receitas");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

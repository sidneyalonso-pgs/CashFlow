"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Todo faturamento (bets e repasse) é recebido/pago pela conta Inter da empresa —
// resolve automaticamente pra não depender de escolha manual em cada fatura.
async function getInterAccountId(supabase: ReturnType<typeof createClient>, companyId: string) {
  const { data } = await supabase
    .from("bank_accounts")
    .select("id")
    .eq("company_id", companyId)
    .or("nickname.ilike.%inter%,bank_name.ilike.%inter%")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

type FaturaLancavel = {
  company_id: string;
  competencia: string;
  modelo: string;
  total: number;
  total_repasse: number;
  data_vencimento?: string | null;
  data_repasse?: string | null;
};

/**
 * Cria os lançamentos financeiros de uma fatura: a receita (só nos modelos em que o dinheiro
 * de fato entra pra nós) e o repasse a pagar. Devolve os ids pra vincular na fatura.
 *
 * A baixa também usa isso: fatura importada de fora do sistema chega sem lançamento nenhum,
 * e sem isso ela virava "paga" sem nada aparecer no Cash Flow.
 */
async function criarLancamentosFatura(
  supabase: ReturnType<typeof createClient>,
  fatura: FaturaLancavel,
  clientName: string,
  interAccountId: string | null
): Promise<{ revenueId: string | null; paymentId: string | null; error?: string }> {
  const hoje = new Date().toISOString().split("T")[0];
  const competenciaLabel = fatura.competencia
    ? new Date(fatura.competencia + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : fatura.competencia;

  // Receita só para bets e mensalidade (dinheiro que de fato entra para nós).
  // No modelo transação o fee já é reconhecido pelos lançamentos diários (CCME/FEE)
  // e o valor faturado é repasse do cliente, então gerar receita aqui contaria em dobro.
  let revenueId: string | null = null;
  if ((fatura.modelo === "bets" || fatura.modelo === "mensalidade") && Number(fatura.total) > 0) {
    const { data: rev, error: revErr } = await supabase.from("revenues").insert({
      company_id: fatura.company_id,
      description: `Faturamento — ${clientName} (${competenciaLabel})`,
      expected_amount: fatura.total,
      expected_date: fatura.data_vencimento ?? hoje,
      receiving_bank_account_id: interAccountId,
      status: "estimada",
    }).select("id").single();
    if (revErr) return { revenueId: null, paymentId: null, error: `a receita falhou: ${revErr.message}` };
    revenueId = rev?.id ?? null;
  }

  let paymentId: string | null = null;
  if (Number(fatura.total_repasse) > 0) {
    // payments.supplier_id é NOT NULL: reaproveita o fornecedor do cliente ou cria
    const { data: existingSupplier } = await supabase
      .from("suppliers").select("id").eq("legal_name", clientName).limit(1).maybeSingle();

    let supplierId = existingSupplier?.id ?? null;
    if (!supplierId) {
      const { data: newSupplier, error: supErr } = await supabase.from("suppliers").insert({
        legal_name: clientName,
        person_type: "juridica",
        status: "ativo",
        cost_type: "despesas",
      }).select("id").single();
      if (supErr) return { revenueId, paymentId: null, error: `o fornecedor do repasse falhou: ${supErr.message}` };
      supplierId = newSupplier?.id ?? null;
    }

    // provisiona na data de vencimento (a data de repasse é só a expectativa de quando o
    // dinheiro sai de fato — a baixa real acontece depois, com a data efetiva do pagamento)
    const repasseDate = fatura.data_vencimento ?? fatura.data_repasse ?? hoje;
    const { data: pay, error: payErr } = await supabase.from("payments").insert({
      company_id: fatura.company_id,
      supplier_id: supplierId,
      description: `Repasse — ${clientName} (${competenciaLabel})`,
      gross_amount: fatura.total_repasse,
      document_date: repasseDate,
      due_date: repasseDate,
      expected_payment_date: repasseDate,
      competence_date: repasseDate,
      paying_bank_account_id: interAccountId,
      status: "agendado",
    }).select("id").single();
    if (payErr) return { revenueId, paymentId: null, error: `o repasse falhou: ${payErr.message}` };
    paymentId = pay?.id ?? null;
  }

  return { revenueId, paymentId };
}

export async function createBillingClient(data: {
  razao: string; cnpj?: string; email_cobranca?: string; chave_pix?: string;
  agencia?: string; conta?: string; num_conta?: string; contrato: boolean;
  modelo: string; in_tipo: string; in_val: number; out_tipo: string; out_val: number;
  rep_in: number; rep_out: number; faixas_mens?: any[];
}) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_clients").insert({
    ...data,
    faixas_mens: data.faixas_mens ? data.faixas_mens : null,
  });
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function updateBillingClient(id: string, data: {
  razao?: string; cnpj?: string; email_cobranca?: string; chave_pix?: string;
  agencia?: string; conta?: string; num_conta?: string; contrato?: boolean;
  modelo?: string; in_tipo?: string; in_val?: number; out_tipo?: string; out_val?: number;
  rep_in?: number; rep_out?: number; faixas_mens?: any[]; status?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_clients").update({
    ...data,
    faixas_mens: data.faixas_mens !== undefined ? data.faixas_mens : undefined,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function deleteBillingClient(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function createSubconta(data: {
  client_id: string; razao: string; cnpj?: string; num_conta?: string;
  in_tipo?: string; in_val?: number; rep_in?: number;
  out_tipo?: string; out_val?: number; rep_out?: number; status?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_subcontas").insert(data);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function updateSubconta(id: string, data: {
  razao?: string; cnpj?: string; num_conta?: string;
  in_tipo?: string; in_val?: number; rep_in?: number;
  out_tipo?: string; out_val?: number; rep_out?: number; status?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_subcontas").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function deleteSubconta(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("billing_subcontas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/clientes");
  return { error: null };
}

export async function emitirFatura(data: {
  client_id: string; company_id: string; competencia: string;
  inicio?: string; fim?: string; modelo: string;
  qtd_in: number; qtd_out: number;
  fee_in: number; fee_out: number;
  repasse_in: number; repasse_out: number;
  num_contas: number; faixa_mens?: string;
  total_faturado: number; desconto_perc: number; desconto_val: number;
  total_repasse: number; total: number;
  obs?: string; data_vencimento?: string; data_repasse?: string;
  subcontas_detalhe?: any;
}) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("billing_clients").select("razao").eq("id", data.client_id).single();
  const clientName = client?.razao ?? "Cliente";
  const interAccountId = await getInterAccountId(supabase, data.company_id);

  const { data: invoice, error: invError } = await supabase
    .from("billing_invoices")
    .insert({
      ...data,
      subcontas_detalhe: data.subcontas_detalhe ?? null,
      status: "pendente",
      data_emissao: new Date().toISOString().split("T")[0],
    })
    .select("id").single();

  if (invError) return { error: invError.message };

  const { revenueId, paymentId, error: lancErr } = await criarLancamentosFatura(
    supabase,
    data,
    clientName,
    interAccountId
  );
  if (lancErr) return { error: `Fatura criada, mas ${lancErr}` };

  if (revenueId || paymentId) {
    await supabase.from("billing_invoices").update({
      revenue_id: revenueId,
      payment_id: paymentId,
    }).eq("id", invoice.id);
  }

  revalidatePath("/faturamento");
  revalidatePath("/faturamento/faturas");
  revalidatePath("/receitas");
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null, id: invoice.id };
}

export async function baixarFatura(invoiceId: string, dataPgto: string) {
  const supabase = createClient();
  const { data: invoiceRow } = await supabase
    .from("billing_invoices")
    .select("client_id, company_id, competencia, modelo, revenue_id, payment_id, total, total_repasse, data_vencimento, data_repasse")
    .eq("id", invoiceId).single();

  if (!invoiceRow) return { error: "Fatura não encontrada." };
  const invoice = invoiceRow as any;

  const interAccountId = await getInterAccountId(supabase, invoice.company_id);

  // Fatura importada de fora do sistema não tem receita nem repasse criados. Sem gerar
  // agora, a baixa marcaria a fatura como paga sem nada aparecer no Cash Flow.
  if (!invoice.revenue_id && !invoice.payment_id) {
    const { data: client } = await supabase
      .from("billing_clients").select("razao").eq("id", invoice.client_id).single();
    const { revenueId, paymentId, error: lancErr } = await criarLancamentosFatura(
      supabase,
      // sem vencimento (caso das importadas), a data da baixa é a referência do lançamento
      { ...invoice, data_vencimento: invoice.data_vencimento ?? dataPgto },
      client?.razao ?? "Cliente",
      interAccountId
    );
    if (lancErr) return { error: `Não foi possível gerar os lançamentos da fatura: ${lancErr}` };
    if (!revenueId && !paymentId) {
      // recusa a baixa em vez de marcar como paga sem nada no Cash Flow, que foi o bug original
      return {
        error:
          `Esta fatura não gerou receita nem repasse a lançar (modelo "${invoice.modelo}", ` +
          `total ${invoice.total}, repasse ${invoice.total_repasse}). A baixa não foi feita porque ` +
          `não produziria movimento no Cash Flow — confira o modelo e os valores da fatura.`,
      };
    }
    await supabase.from("billing_invoices").update({ revenue_id: revenueId, payment_id: paymentId }).eq("id", invoiceId);
    invoice.revenue_id = revenueId;
    invoice.payment_id = paymentId;
  }

  const { error: invErr } = await supabase.from("billing_invoices").update({
    status: "pago", data_pgto: dataPgto,
  }).eq("id", invoiceId);
  if (invErr) return { error: invErr.message };

  if (invoice.revenue_id) {
    const amount = Number(invoice.total ?? 0);
    if (amount > 0) {
      const { error } = await supabase.from("revenues").update({
        status: "recebida",
        realized_amount: amount,
        realized_date: dataPgto,
        receiving_bank_account_id: interAccountId,
      }).eq("id", invoice.revenue_id);
      if (error) return { error: error.message };

      // substitui a baixa anterior para a receita nao contar duas vezes
      await supabase.from("revenue_realizations").delete().eq("revenue_id", invoice.revenue_id);
      const { error: realErr } = await supabase.from("revenue_realizations").insert({
        revenue_id: invoice.revenue_id,
        amount,
        received_at: dataPgto,
        bank_account_id: interAccountId,
      });
      if (realErr) return { error: realErr.message };
    }
  }

  if (invoice.payment_id) {
    const amount = Number(invoice.total_repasse ?? 0);
    if (amount > 0) {
      const { error } = await supabase.from("payments").update({
        status: "pago",
        paid_amount: amount,
        effective_payment_date: dataPgto,
        // sem isso o repasse não aparece no Cash Flow ao filtrar por uma conta específica
        paying_bank_account_id: interAccountId,
      }).eq("id", invoice.payment_id);
      if (error) return { error: error.message };

      // sem esta baixa o repasse some do Cash Flow: sai de provisionado e nao entra em realizado
      await supabase.from("payment_realizations").delete().eq("payment_id", invoice.payment_id);
      const { error: realErr } = await supabase.from("payment_realizations").insert({
        payment_id: invoice.payment_id,
        amount,
        paid_at: dataPgto,
        bank_account_id: interAccountId,
      });
      if (realErr) return { error: realErr.message };
    }
  }

  revalidatePath("/faturamento");
  revalidatePath("/faturamento/faturas");
  revalidatePath("/receitas");
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function cancelarFatura(invoiceId: string) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("billing_invoices").select("revenue_id, payment_id").eq("id", invoiceId).single();

  const { error } = await supabase.from("billing_invoices").update({ status: "cancelado" }).eq("id", invoiceId);
  if (error) return { error: error.message };

  // apaga as baixas junto: sem isso o Cash Flow continua contando a fatura cancelada,
  // porque ele filtra os lançamentos por deleted_at, não por status
  if (invoice?.revenue_id) {
    await supabase.from("revenue_realizations").delete().eq("revenue_id", invoice.revenue_id);
    await supabase.from("revenues").update({
      status: "cancelada", realized_amount: null, realized_date: null,
    }).eq("id", invoice.revenue_id);
  }
  if (invoice?.payment_id) {
    await supabase.from("payment_realizations").delete().eq("payment_id", invoice.payment_id);
    await supabase.from("payments").update({
      status: "cancelado", paid_amount: null, effective_payment_date: null,
    }).eq("id", invoice.payment_id);
  }

  revalidatePath("/faturamento");
  revalidatePath("/faturamento/faturas");
  revalidatePath("/receitas");
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function criarNotaDebito(data: {
  pagador: string; cnpj_pagador?: string; end_pagador?: string;
  recebedor: string; cnpj_recebedor?: string; end_recebedor?: string;
  debitado?: string; cnpj_debitado?: string;
  tipo: string; ref?: string; competencia: string; vencimento?: string;
  itens: Array<{ desc: string; comp: string; val: number }>;
  total: number; obs?: string;
}) {
  const supabase = createClient();

  // Generate sequential numero_nd
  const { count } = await supabase
    .from("billing_debit_notes")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(3, "0");
  const ano = new Date().getFullYear().toString().slice(-2);
  const numero_nd = `${seq}/${ano}`;

  const { data: nd, error } = await supabase
    .from("billing_debit_notes")
    .insert({
      ...data,
      numero_nd,
      itens: data.itens,
      status: "Pendente",
      data_emissao: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (error) return { error: error.message, id: null };
  revalidatePath("/faturamento/notas-debito");
  return { error: null, id: nd.id };
}

export async function baixarNotaDebito(ndId: string, dataPgto: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("billing_debit_notes")
    .update({ status: "Pago", data_pgto: dataPgto })
    .eq("id", ndId);
  if (error) return { error: error.message };
  revalidatePath("/faturamento/notas-debito");
  return { error: null };
}

export async function cancelarNotaDebito(ndId: string) {
  const supabase = createClient();
  await supabase.from("billing_debit_notes").update({ status: "Cancelado" }).eq("id", ndId);
  revalidatePath("/faturamento/notas-debito");
  return { error: null };
}

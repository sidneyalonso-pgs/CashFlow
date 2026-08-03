"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
}) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("billing_clients").select("razao").eq("id", data.client_id).single();
  const clientName = client?.razao ?? "Cliente";

  const { data: invoice, error: invError } = await supabase
    .from("billing_invoices")
    .insert({
      ...data,
      status: "pendente",
      data_emissao: new Date().toISOString().split("T")[0],
    })
    .select("id").single();

  if (invError) return { error: invError.message };

  const competenciaLabel = data.competencia
    ? new Date(data.competencia + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : data.competencia;

  // Create revenue (fee to receive)
  let revenueId: string | null = null;
  if (data.total > 0) {
    const { data: rev } = await supabase.from("revenues").insert({
      company_id: data.company_id,
      description: `Fee Faturamento — ${clientName} (${competenciaLabel})`,
      expected_amount: data.total,
      expected_date: data.data_vencimento ?? new Date().toISOString().split("T")[0],
      status: "estimada",
    }).select("id").single();
    revenueId = rev?.id ?? null;
  }

  // Create payment (repasse to make)
  let paymentId: string | null = null;
  if (data.total_repasse > 0) {
    const { data: pay } = await supabase.from("payments").insert({
      company_id: data.company_id,
      description: `Repasse — ${clientName} (${competenciaLabel})`,
      gross_amount: data.total_repasse,
      due_date: data.data_repasse ?? null,
      status: "provisionado",
    }).select("id").single();
    paymentId = pay?.id ?? null;
  }

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
  return { error: null, id: invoice.id };
}

export async function baixarFatura(invoiceId: string, dataPgto: string) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("billing_invoices")
    .select("revenue_id, payment_id")
    .eq("id", invoiceId).single();

  await supabase.from("billing_invoices").update({
    status: "pago", data_pgto: dataPgto,
  }).eq("id", invoiceId);

  if (invoice?.revenue_id) {
    await supabase.from("revenues").update({
      status: "recebida",
      realized_amount: undefined,
      realized_date: dataPgto,
    }).eq("id", invoice.revenue_id);
    await supabase.from("revenue_realizations").insert({
      revenue_id: invoice.revenue_id,
      amount: (await supabase.from("billing_invoices").select("total").eq("id", invoiceId).single()).data?.total,
      received_at: dataPgto,
    });
  }

  if (invoice?.payment_id) {
    await supabase.from("payments").update({ status: "pago" }).eq("id", invoice.payment_id);
  }

  revalidatePath("/faturamento");
  revalidatePath("/faturamento/faturas");
  revalidatePath("/receitas");
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  return { error: null };
}

export async function cancelarFatura(invoiceId: string) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("billing_invoices").select("revenue_id, payment_id").eq("id", invoiceId).single();

  await supabase.from("billing_invoices").update({ status: "cancelado" }).eq("id", invoiceId);
  if (invoice?.revenue_id) await supabase.from("revenues").update({ status: "cancelada" }).eq("id", invoice.revenue_id);
  if (invoice?.payment_id) await supabase.from("payments").update({ status: "cancelado" }).eq("id", invoice.payment_id);

  revalidatePath("/faturamento");
  revalidatePath("/faturamento/faturas");
  return { error: null };
}

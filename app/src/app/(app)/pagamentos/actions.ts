"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertReasonableDate } from "@/lib/validators/dateSanity";

// Competência informada à mão (campo mês/ano "AAAA-MM"): vira o dia 1 do mês. Vazio = segue a data do pagamento.
function competenciaDe(v: FormDataEntryValue | string | null | undefined): string | null {
  const s = String(v ?? "");
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? `${s}-01` : null;
}

/** Quantos meses à frente um pagamento recorrente é provisionado automaticamente. */
const MESES_RECORRENCIA = 6;

// Semana do mês → dia âncora (o mesmo critério do "Gerar" em Pagamentos recorrentes)
const SEMANA_PARA_DIA: Record<number, number> = { 1: 7, 2: 14, 3: 21, 4: 28, 5: 28 };

type PagamentoRecorrente = {
  company_id: string;
  supplier_id: string;
  description: string;
  gross_amount: number;
  category_id: string | null;
  cost_center_id: string | null;
  paying_bank_account_id: string | null;
  cost_type: string;
  fixed_variable: string | null;
  chart_account_id: string | null;
  due_date: string;
  competence_date: string;
  notes?: string | null;
};

/** Soma k meses a uma data AAAA-MM-DD mantendo o dia (ou o dia informado); em mês curto vai para o último dia. */
function somaMeses(iso: string, k: number, dia?: number | null): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = y * 12 + (m - 1) + k;
  const ano = Math.floor(total / 12);
  const mes = total % 12;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const diaFinal = Math.min(dia && dia > 0 ? dia : d, ultimoDia);
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

/** Dia do mês escolhido no formulário (por dia, ou por semana do mês); null = mesmo dia do lançamento. */
function diaDoAgendamento(mode: string, dayOfMonth: number | null, weekOfMonth: number | null): number | null {
  if (mode === "dia") return dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null;
  if (mode === "semana") return weekOfMonth ? SEMANA_PARA_DIA[weekOfMonth] ?? null : null;
  return null;
}

/**
 * Provisiona os próximos MESES_RECORRENCIA meses de pagamentos marcados como recorrentes:
 * mesmo fornecedor, empresa, valor, descrição e conta, no mesmo dia do mês (status "agendado").
 *
 * Não duplica: antes de criar, conta quantos pagamentos idênticos já existem naquela data e só
 * cria os que faltam. Isso importa porque pode haver parcelas iguais no mesmo dia (ex.: duas
 * de R$ 6.306,47) — a contagem respeita a quantidade, e repetir o lançamento não gera de novo.
 */
async function gerarRecorrencias(
  supabase: ReturnType<typeof createClient>,
  userId: string | undefined,
  itens: PagamentoRecorrente[],
  dia?: number | null
): Promise<{ criados: number; error?: string }> {
  const grupos = new Map<string, { base: PagamentoRecorrente; qtd: number }>();
  for (const it of itens) {
    const chave = [it.company_id, it.supplier_id, it.gross_amount, it.description, it.due_date].join("|");
    const g = grupos.get(chave);
    if (g) g.qtd++;
    else grupos.set(chave, { base: it, qtd: 1 });
  }

  const novos: Record<string, unknown>[] = [];
  for (const { base, qtd } of grupos.values()) {
    for (let k = 1; k <= MESES_RECORRENCIA; k++) {
      const due = somaMeses(base.due_date, k, dia);
      // competência manual (outro mês) acompanha o deslocamento; sem ela, segue a data do pagamento
      const comp = base.competence_date === base.due_date ? due : somaMeses(base.competence_date, k);

      const { data: existentes, error } = await supabase
        .from("payments")
        .select("id")
        .eq("company_id", base.company_id)
        .eq("supplier_id", base.supplier_id)
        .eq("gross_amount", base.gross_amount)
        .eq("description", base.description)
        .eq("due_date", due)
        .is("deleted_at", null);
      if (error) return { criados: 0, error: error.message };

      const faltam = qtd - (existentes?.length ?? 0);
      for (let i = 0; i < faltam; i++) {
        novos.push({
          company_id: base.company_id,
          supplier_id: base.supplier_id,
          description: base.description,
          gross_amount: base.gross_amount,
          currency: "BRL",
          category_id: base.category_id,
          cost_center_id: base.cost_center_id,
          paying_bank_account_id: base.paying_bank_account_id,
          cost_type: base.cost_type,
          fixed_variable: base.fixed_variable,
          chart_account_id: base.chart_account_id,
          document_date: due,
          due_date: due,
          expected_payment_date: due,
          competence_date: comp,
          notes: base.notes ?? null,
          recurring: true,
          status: "agendado",
          created_by: userId,
          updated_by: userId,
        });
      }
    }
  }

  if (novos.length === 0) return { criados: 0 };
  const { error } = await supabase.from("payments").insert(novos);
  if (error) return { criados: 0, error: error.message };
  return { criados: novos.length };
}

export async function createPaidPayment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const paidAt = String(formData.get("paid_at") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const bankAccountId = String(formData.get("paying_bank_account_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const recurring = formData.get("recurring") === "on";

  if (!companyId || !supplierId || !grossAmount || grossAmount <= 0 || !paidAt) {
    return { error: "Preencha empresa, fornecedor, valor e data do pagamento." };
  }

  const dateError = assertReasonableDate(paidAt, "Data do pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("legal_name, cost_type, cost_structure, default_description, chart_account_id")
    .eq("id", supplierId)
    .single();

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      company_id: companyId,
      supplier_id: supplierId,
      description: description || supplier?.default_description || supplier?.legal_name || "Pagamento",
      gross_amount: grossAmount,
      currency: "BRL",
      category_id: categoryId,
      cost_center_id: costCenterId,
      cost_type: supplier?.cost_type ?? "despesas",
      fixed_variable: supplier?.cost_structure ?? null,
      chart_account_id: supplier?.chart_account_id ?? null,
      paying_bank_account_id: bankAccountId,
      document_date: paidAt,
      due_date: paidAt,
      expected_payment_date: paidAt,
      competence_date: competenciaDe(formData.get("competence")) ?? paidAt,
      effective_payment_date: paidAt,
      paid_amount: grossAmount,
      recurring,
      notes,
      status: "pago",
      created_by: user?.id,
      updated_by: user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: realizationError } = await supabase.from("payment_realizations").insert({
    payment_id: payment.id,
    amount: grossAmount,
    paid_at: paidAt,
    bank_account_id: bankAccountId,
    created_by: user?.id,
  });

  if (realizationError) return { error: realizationError.message };

  if (recurring) {
    const scheduleMode = String(formData.get("schedule_mode") || "dia");
    const dayOfMonth = scheduleMode === "dia" ? Number(formData.get("day_of_month")) || null : null;
    const weekOfMonth = scheduleMode === "semana" ? Number(formData.get("week_of_month")) || null : null;
    const descricaoFinal = description || supplier?.default_description || supplier?.legal_name || "Pagamento";
    const rec = await gerarRecorrencias(
      supabase,
      user?.id,
      [
        {
          company_id: companyId,
          supplier_id: supplierId,
          description: descricaoFinal,
          gross_amount: grossAmount,
          category_id: categoryId,
          cost_center_id: costCenterId,
          paying_bank_account_id: bankAccountId,
          cost_type: supplier?.cost_type ?? "despesas",
          fixed_variable: supplier?.cost_structure ?? null,
          chart_account_id: supplier?.chart_account_id ?? null,
          due_date: paidAt,
          competence_date: competenciaDe(formData.get("competence")) ?? paidAt,
          notes,
        },
      ],
      diaDoAgendamento(scheduleMode, dayOfMonth, weekOfMonth)
    );
    // o pagamento já foi gravado: se só a recorrência falhar, avisa em vez de esconder
    if (rec.error) return { error: `Pagamento lançado, mas os meses seguintes não foram gerados: ${rec.error}` };
  }

  revalidatePath("/pagamentos");
  revalidatePath("/pagamentos/recorrentes");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  redirect("/pagamentos");
}

export async function createScheduledPayment(formData: FormData) {
  const companyId = String(formData.get("company_id") || "");
  const supplierId = String(formData.get("supplier_id") || "");
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const expectedDate = String(formData.get("expected_payment_date") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const bankAccountId = String(formData.get("paying_bank_account_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const recurring = formData.get("recurring") === "on";

  if (!companyId || !supplierId || !grossAmount || grossAmount <= 0 || !expectedDate) {
    return { error: "Preencha empresa, fornecedor, valor e data prevista." };
  }

  const dateError = assertReasonableDate(expectedDate, "Data prevista de pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("legal_name, cost_type, cost_structure, default_description, chart_account_id")
    .eq("id", supplierId)
    .single();

  const { error } = await supabase.from("payments").insert({
    company_id: companyId,
    supplier_id: supplierId,
    description: description || supplier?.default_description || supplier?.legal_name || "Pagamento",
    gross_amount: grossAmount,
    currency: "BRL",
    category_id: categoryId,
    cost_center_id: costCenterId,
    cost_type: supplier?.cost_type ?? "despesas",
    fixed_variable: supplier?.cost_structure ?? null,
    paying_bank_account_id: bankAccountId,
    document_date: expectedDate,
    due_date: expectedDate,
    expected_payment_date: expectedDate,
    competence_date: competenciaDe(formData.get("competence")) ?? expectedDate,
    recurring,
    notes,
    status: "agendado",
    created_by: user?.id,
    updated_by: user?.id,
  });

  if (error) return { error: error.message };

  if (recurring) {
    const scheduleMode = String(formData.get("schedule_mode") || "dia");
    const dayOfMonth = scheduleMode === "dia" ? Number(formData.get("day_of_month")) || null : null;
    const weekOfMonth = scheduleMode === "semana" ? Number(formData.get("week_of_month")) || null : null;
    const descricaoFinal = description || supplier?.default_description || supplier?.legal_name || "Pagamento";
    const rec = await gerarRecorrencias(
      supabase,
      user?.id,
      [
        {
          company_id: companyId,
          supplier_id: supplierId,
          description: descricaoFinal,
          gross_amount: grossAmount,
          category_id: categoryId,
          cost_center_id: costCenterId,
          paying_bank_account_id: bankAccountId,
          cost_type: supplier?.cost_type ?? "despesas",
          fixed_variable: supplier?.cost_structure ?? null,
          chart_account_id: supplier?.chart_account_id ?? null,
          due_date: expectedDate,
          competence_date: competenciaDe(formData.get("competence")) ?? expectedDate,
          notes,
        },
      ],
      diaDoAgendamento(scheduleMode, dayOfMonth, weekOfMonth)
    );
    if (rec.error) return { error: `Pagamento lançado, mas os meses seguintes não foram gerados: ${rec.error}` };
  }

  revalidatePath("/pagamentos");
  revalidatePath("/pagamentos/recorrentes");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  redirect("/pagamentos");
}

export async function settlePayment(paymentId: string, amount: number, paidAt: string, bankAccountId: string | null) {
  if (!amount || amount <= 0) return { error: "Valor deve ser maior que zero" };

  const dateError = assertReasonableDate(paidAt, "Data do pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // upsert por payment_id (chave única no banco): substitui a baixa anterior atomicamente,
  // sem a janela de corrida do apagar-depois-inserir que já duplicou baixa mais de uma vez
  // (duplo clique / reenvio de formulário conseguiam inserir os dois antes que um apagasse o outro)
  const { error: realizationError } = await supabase.from("payment_realizations").upsert(
    {
      payment_id: paymentId,
      amount,
      paid_at: paidAt,
      bank_account_id: bankAccountId,
      created_by: user?.id,
    },
    { onConflict: "payment_id" }
  );
  if (realizationError) return { error: realizationError.message };

  // competência lançada à mão (diferente do vencimento) não é sobrescrita pela data da baixa
  const { data: atual } = await supabase.from("payments").select("due_date, competence_date").eq("id", paymentId).single();
  const competenciaManual = !!atual?.competence_date && atual.competence_date !== atual.due_date;

  const { error } = await supabase
    .from("payments")
    .update({
      status: "pago",
      gross_amount: amount,
      paid_amount: amount,
      effective_payment_date: paidAt,
      due_date: paidAt,
      expected_payment_date: paidAt,
      ...(competenciaManual ? {} : { competence_date: paidAt }),
      document_date: paidAt,
    })
    .eq("id", paymentId);

  if (error) return { error: error.message };

  // baixa feita aqui também fecha a fatura ligada a este repasse (senão ela fica "pendente" no faturamento)
  await supabase
    .from("billing_invoices")
    .update({ status: "pago", data_pgto: paidAt })
    .eq("payment_id", paymentId)
    .eq("status", "pendente");

  revalidatePath("/pagamentos");
  revalidatePath("/faturamento");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function bulkSettlePayments(
  entries: Array<{ id: string; amount: number; paidAt: string; bankAccountId: string | null }>
) {
  const results = await Promise.all(
    entries.map((e) => settlePayment(e.id, e.amount, e.paidAt, e.bankAccountId))
  );
  const errors = results.filter((r) => r.error).map((r) => r.error as string);
  revalidatePath("/pagamentos");
  return { errors };
}

export async function recordAttachment(params: {
  paymentId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("attachments").insert({
    entity_type: "payment",
    entity_id: params.paymentId,
    storage_path: params.storagePath,
    original_name: params.originalName,
    content_type: params.contentType,
    size_bytes: params.sizeBytes,
    uploaded_by: user?.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${params.paymentId}`);
  return { error: null };
}

export async function updatePayment(paymentId: string, formData: FormData) {
  const description = String(formData.get("description") || "");
  const grossAmount = Number(formData.get("gross_amount"));
  const categoryId = String(formData.get("category_id") || "") || null;
  const costCenterId = String(formData.get("cost_center_id") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  const dueDate = String(formData.get("due_date") || "") || null;
  const competencia = competenciaDe(formData.get("competence"));

  if (!grossAmount || grossAmount <= 0) {
    return { error: "Preencha o valor." };
  }
  if (dueDate) {
    const dateError = assertReasonableDate(dueDate, "Data de vencimento");
    if (dateError) return { error: dateError };
  }

  const supabase = createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("status, due_date, competence_date, suppliers(legal_name, default_description)")
    .eq("id", paymentId)
    .single();

  const finalDescription =
    description ||
    (payment as any)?.suppliers?.default_description ||
    (payment as any)?.suppliers?.legal_name ||
    "Pagamento";

  const update: Record<string, unknown> = {
    description: finalDescription,
    gross_amount: grossAmount,
    category_id: categoryId,
    cost_center_id: costCenterId,
    notes,
  };

  if (dueDate) {
    update.due_date = dueDate;
    update.expected_payment_date = dueDate;
  }

  // competência: a informada no formulário; sem ela, mantém a lançada à mão (diferente do vencimento) e,
  // se estava seguindo a data, acompanha a nova data nos pagamentos já pagos (comportamento de sempre)
  const competenciaManual = !!payment?.competence_date && payment.competence_date !== payment.due_date;
  if (competencia) update.competence_date = competencia;

  if (payment?.status === "pago") {
    update.paid_amount = grossAmount;
    if (dueDate) {
      update.effective_payment_date = dueDate;
      if (!competencia && !competenciaManual) update.competence_date = dueDate;
      update.document_date = dueDate;
    }

    const { data: realizations } = await supabase
      .from("payment_realizations")
      .select("id")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (realizations && realizations.length > 0) {
      const realizationUpdate: Record<string, unknown> = { amount: grossAmount };
      if (dueDate) realizationUpdate.paid_at = dueDate;

      await supabase.from("payment_realizations").update(realizationUpdate).eq("id", realizations[0].id);
    }
  } else {
    // um pagamento nao pago nunca deve ter baixa (payment_realizations) associada,
    // senao ele conta em dobro no Cash Flow (como saida e como provisao de saida)
    await supabase.from("payment_realizations").delete().eq("payment_id", paymentId);
  }

  const { error } = await supabase.from("payments").update(update).eq("id", paymentId);

  if (error) return { error: error.message };

  revalidatePath(`/pagamentos/${paymentId}`);
  revalidatePath("/pagamentos");
  return { error: null };
}

export async function updatePaymentBankAccount(paymentId: string, bankAccountId: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from("payments")
    .update({ paying_bank_account_id: bankAccountId })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function updatePaymentDueDate(paymentId: string, dueDate: string) {
  if (!dueDate) return { error: "Informe a data de vencimento." };

  const dateError = assertReasonableDate(dueDate, "Data de vencimento");
  if (dateError) return { error: dateError };

  const supabase = createClient();

  const { data: payment } = await supabase.from("payments").select("status, due_date, competence_date").eq("id", paymentId).single();

  const update: Record<string, unknown> = {
    due_date: dueDate,
    expected_payment_date: dueDate,
  };

  if (payment?.status === "pago") {
    update.effective_payment_date = dueDate;
    // competência lançada à mão (diferente do vencimento) fica como está
    if (!payment.competence_date || payment.competence_date === payment.due_date) update.competence_date = dueDate;
    update.document_date = dueDate;

    const { data: realizations } = await supabase
      .from("payment_realizations")
      .select("id")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (realizations && realizations.length > 0) {
      await supabase.from("payment_realizations").update({ paid_at: dueDate }).eq("id", realizations[0].id);
    }
  }

  const { error } = await supabase.from("payments").update(update).eq("id", paymentId);

  if (error) return { error: error.message };

  revalidatePath("/pagamentos");
  revalidatePath(`/pagamentos/${paymentId}`);
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  revalidatePath("/");
  return { error: null };
}

export async function cancelPayment(paymentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("payments").update({ status: "cancelado" }).eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath(`/pagamentos/${paymentId}`);
  revalidatePath("/pagamentos");
  return { error: null };
}

export async function deletePayment(paymentId: string) {
  const supabase = createClient();
  await supabase.from("payment_realizations").delete().eq("payment_id", paymentId);
  const { error } = await supabase
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function quickMarkPaid(paymentId: string, paidAt: string, amount: number) {
  const dateError = assertReasonableDate(paidAt, "Data do pagamento");
  if (dateError) return { error: dateError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: re } = await supabase.from("payment_realizations").upsert(
    {
      payment_id: paymentId,
      amount,
      paid_at: paidAt,
      created_by: user?.id,
    },
    { onConflict: "payment_id" }
  );
  if (re) return { error: re.message };

  const { error } = await supabase
    .from("payments")
    .update({
      status: "pago",
      paid_amount: amount,
      effective_payment_date: paidAt,
      due_date: paidAt,
    })
    .eq("id", paymentId);

  if (error) return { error: error.message };
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function markPaymentAsOpen(paymentId: string) {
  const supabase = createClient();
  await supabase.from("payment_realizations").delete().eq("payment_id", paymentId);
  const { error } = await supabase
    .from("payments")
    .update({ status: "agendado", paid_amount: null, effective_payment_date: null })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

export async function createBulkPayments(rows: Array<{
  company_id: string;
  supplier_id: string;
  description: string;
  gross_amount: number;
  date: string;
  mode: "pago" | "programado";
  category_id?: string | null;
  cost_center_id?: string | null;
  bank_account_id?: string | null;
  recurring?: boolean;
  competence?: string | null;
}>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const errors: string[] = [];
  // linhas gravadas com "Recorrente": depois do laço, os meses seguintes são provisionados de uma vez
  const recorrentes: PagamentoRecorrente[] = [];

  for (const row of rows) {
    if (!row.company_id || !row.supplier_id || !row.gross_amount || row.gross_amount <= 0 || !row.date) {
      errors.push(`Linha inválida: preencha empresa, fornecedor, valor e data.`);
      continue;
    }
    const dateError = assertReasonableDate(row.date, "Data");
    if (dateError) { errors.push(dateError); continue; }

    const { data: supplier } = await supabase
      .from("suppliers")
      .select("legal_name, cost_type, cost_structure, default_description, chart_account_id")
      .eq("id", row.supplier_id)
      .single();

    const description = row.description || supplier?.default_description || supplier?.legal_name || "Pagamento";
    const isPaid = row.mode === "pago";

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        company_id: row.company_id,
        supplier_id: row.supplier_id,
        description,
        gross_amount: row.gross_amount,
        currency: "BRL",
        category_id: row.category_id || null,
        cost_center_id: row.cost_center_id || null,
        paying_bank_account_id: row.bank_account_id || null,
        cost_type: supplier?.cost_type ?? "despesas",
      fixed_variable: supplier?.cost_structure ?? null,
      chart_account_id: supplier?.chart_account_id ?? null,
        document_date: row.date,
        due_date: row.date,
        expected_payment_date: row.date,
        competence_date: competenciaDe(row.competence) ?? row.date,
        ...(isPaid ? { effective_payment_date: row.date, paid_amount: row.gross_amount, status: "pago" } : { status: "agendado" }),
        recurring: row.recurring ?? false,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select("id")
      .single();

    if (error) { errors.push(error.message); continue; }

    if (isPaid && payment) {
      await supabase.from("payment_realizations").insert({
        payment_id: payment.id,
        amount: row.gross_amount,
        paid_at: row.date,
        created_by: user?.id,
      });
    }

    if (row.recurring) {
      recorrentes.push({
        company_id: row.company_id,
        supplier_id: row.supplier_id,
        description,
        gross_amount: row.gross_amount,
        category_id: row.category_id || null,
        cost_center_id: row.cost_center_id || null,
        paying_bank_account_id: row.bank_account_id || null,
        cost_type: supplier?.cost_type ?? "despesas",
        fixed_variable: supplier?.cost_structure ?? null,
        chart_account_id: supplier?.chart_account_id ?? null,
        due_date: row.date,
        competence_date: competenciaDe(row.competence) ?? row.date,
      });
    }
  }

  if (recorrentes.length > 0) {
    const rec = await gerarRecorrencias(supabase, user?.id, recorrentes);
    if (rec.error) errors.push(`Pagamentos lançados, mas os meses seguintes não foram gerados: ${rec.error}`);
  }

  revalidatePath("/pagamentos");
  revalidatePath("/pagamentos/recorrentes");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { errors };
}

export async function createRecurringFromPayment(paymentId: string, scheduleMode: string, dayOfMonth: number | null, weekOfMonth: number | null) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: p, error } = await supabase
    .from("payments")
    .update({ recurring: true })
    .eq("id", paymentId)
    .select(
      "company_id, supplier_id, description, gross_amount, category_id, cost_center_id, paying_bank_account_id, cost_type, fixed_variable, chart_account_id, due_date, competence_date, notes"
    )
    .single();

  if (error || !p) return { error: error?.message ?? "Pagamento não encontrado." };

  // marcar como recorrente também provisiona os próximos meses (sem duplicar o que já existe)
  const rec = await gerarRecorrencias(
    supabase,
    user?.id,
    [
      {
        ...p,
        gross_amount: Number(p.gross_amount),
        competence_date: p.competence_date ?? p.due_date,
        cost_type: p.cost_type ?? "despesas",
      } as PagamentoRecorrente,
    ],
    diaDoAgendamento(scheduleMode, dayOfMonth, weekOfMonth)
  );
  if (rec.error) return { error: `Marcado como recorrente, mas os meses seguintes não foram gerados: ${rec.error}` };

  revalidatePath("/pagamentos");
  revalidatePath("/pagamentos/recorrentes");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null, criados: rec.criados };
}

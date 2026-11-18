"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reconcileEntry(
  bankEntryId: string,
  entityType: "payment" | "revenue" | "investment_application" | "investment_redemption" | "transfer",
  entityId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: reconciliationError } = await supabase.from("reconciliations").insert({
    bank_statement_entry_id: bankEntryId,
    entity_type: entityType,
    entity_id: entityId,
    matched_by: user?.id,
    match_type: "manual",
  });
  if (reconciliationError) return { error: reconciliationError.message };

  const { error: entryError } = await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "conciliado_manualmente" })
    .eq("id", bankEntryId);
  if (entryError) return { error: entryError.message };

  // Atualiza reconciliation_status só em pagamentos e receitas (investimentos não têm o campo)
  if (entityType === "payment" || entityType === "revenue") {
    const table = entityType === "payment" ? "payments" : "revenues";
    await supabase
      .from(table)
      .update({ reconciliation_status: "conciliado_manualmente" })
      .eq("id", entityId);
  }

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

/**
 * Concilia UMA linha do extrato com várias receitas que caíram juntas no mesmo crédito (Central
 * Piloto). Só confirma se a soma das receitas fecha com o valor da linha — senão nada é gravado.
 */
export async function reconcileEntryGroup(bankEntryId: string, revenueIds: string[]) {
  if (revenueIds.length === 0) return { error: "Nenhuma receita no grupo." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entry }, { data: revenues }] = await Promise.all([
    supabase.from("bank_statement_entries").select("amount").eq("id", bankEntryId).single(),
    supabase.from("revenues").select("id, realized_amount, reconciliation_status").in("id", revenueIds),
  ]);
  if (!entry || !revenues || revenues.length !== revenueIds.length) return { error: "Não encontrei a linha do extrato ou alguma das receitas." };
  if (revenues.some((r: any) => r.reconciliation_status && r.reconciliation_status !== "pendente")) {
    return { error: "Alguma receita do grupo já está conciliada." };
  }
  const soma = Math.round(revenues.reduce((s: number, r: any) => s + Number(r.realized_amount), 0) * 100) / 100;
  if (Math.abs(soma - Number(entry.amount)) > 0.01) {
    return { error: `A soma das receitas (${soma.toFixed(2)}) não bate com a linha do extrato (${Number(entry.amount).toFixed(2)}).` };
  }

  const { error: recError } = await supabase.from("reconciliations").insert(
    revenueIds.map((id) => ({
      bank_statement_entry_id: bankEntryId,
      entity_type: "revenue",
      entity_id: id,
      matched_by: user?.id,
      match_type: "manual",
      notes: "Grupo de receitas da Central Piloto",
    }))
  );
  if (recError) return { error: recError.message };

  await supabase.from("bank_statement_entries").update({ reconciliation_status: "conciliado_manualmente" }).eq("id", bankEntryId);
  await supabase.from("revenues").update({ reconciliation_status: "conciliado_manualmente" }).in("id", revenueIds);

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

 export async function ignoreEntry(bankEntryId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "ignorado" })
    .eq("id", bankEntryId);

  if (error) return { error: error.message };
  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

export async function unreconcileEntry(bankEntryId: string) {
  const supabase = createClient();

  // Buscar as conciliações vinculadas (um grupo da Central Piloto tem várias na mesma linha)
  const { data: recs } = await supabase
    .from("reconciliations")
    .select("entity_type, entity_id")
    .eq("bank_statement_entry_id", bankEntryId);

  // N linhas do banco podem estar ligadas ao mesmo lançamento (um pagamento quebrado em vários PIX):
  // desfazer uma desfaz o grupo todo, senão o lançamento voltaria a pendente com linhas ainda "conciliadas".
  // (só pagamentos e receitas: uma transferência entre contas próprias é conciliada pelos DOIS lados, e cada lado é independente)
  const entityIdsOfEntry = (recs ?? []).filter((r: any) => r.entity_type === "payment" || r.entity_type === "revenue").map((r: any) => r.entity_id);
  if (entityIdsOfEntry.length > 0) {
    const { data: siblings } = await supabase
      .from("reconciliations")
      .select("bank_statement_entry_id")
      .in("entity_type", ["payment", "revenue"])
      .in("entity_id", entityIdsOfEntry);
    const siblingEntryIds = Array.from(new Set((siblings ?? []).map((x: any) => x.bank_statement_entry_id))).filter((id) => id !== bankEntryId);
    if (siblingEntryIds.length > 0) {
      await supabase.from("reconciliations").delete().in("bank_statement_entry_id", siblingEntryIds);
      await supabase.from("bank_statement_entries").update({ reconciliation_status: "pendente" }).in("id", siblingEntryIds);
    }
  }

  if (recs && recs.length > 0) {
    for (const rec of recs) {
      // Só pagamentos e receitas têm o campo reconciliation_status — investimentos e transferências não
      if (rec.entity_type === "payment" || rec.entity_type === "revenue") {
        const table = rec.entity_type === "payment" ? "payments" : "revenues";
        await supabase.from(table).update({ reconciliation_status: "pendente" }).eq("id", rec.entity_id);
      }
    }
    await supabase.from("reconciliations").delete().eq("bank_statement_entry_id", bankEntryId);
  }

  await supabase
    .from("bank_statement_entries")
    .update({ reconciliation_status: "pendente" })
    .eq("id", bankEntryId);

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null };
}

export type BatchItem = {
  /** linhas do extrato do grupo (uma só no caso 1:1 e 1:N) */
  entryIds: string[];
  entityType: "payment" | "revenue" | "investment_application" | "investment_redemption" | "transfer";
  /** lançamentos do grupo (um só no caso 1:1 e N:1) */
  entityIds: string[];
};

const cents = (n: number) => Math.round(n * 100);

/**
 * Concilia vários grupos de uma vez (aprovação das sugestões). Cada grupo é REVALIDADO no servidor
 * antes de gravar: todas as linhas ainda pendentes, nenhum lançamento já conciliado e a SOMA das
 * linhas igual à SOMA dos lançamentos, ao centavo. O que não passar vai em `skipped` e nada é
 * gravado para ele. Formatos aceitos: 1 linha ↔ 1 lançamento, N linhas ↔ 1 lançamento (o banco
 * quebrou um pagamento em vários PIX) e 1 linha ↔ N lançamentos (um débito pagando vários).
 */
export async function reconcileBatch(items: BatchItem[], matchType: "automatico" | "manual" = "automatico") {
  type Skipped = { entryId: string; reason: string };
  if (items.length === 0) return { error: null, done: 0, skipped: [] as Skipped[] };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entryIds = Array.from(new Set(items.flatMap((i) => i.entryIds)));
  const { data: entries } = await supabase
    .from("bank_statement_entries")
    .select("id, amount, reconciliation_status")
    .in("id", entryIds);
  const entryMap = new Map<string, any>((entries ?? []).map((e: any) => [e.id, e]));

  const idsOf = (types: BatchItem["entityType"][]) =>
    Array.from(new Set(items.filter((i) => types.includes(i.entityType)).flatMap((i) => i.entityIds)));

  const invIds = idsOf(["investment_application", "investment_redemption"]);
  const [payments, revenues, investments, transfers] = await Promise.all([
    idsOf(["payment"]).length
      ? supabase.from("payments").select("id, gross_amount, reconciliation_status").in("id", idsOf(["payment"]))
      : Promise.resolve({ data: [] as any[] }),
    idsOf(["revenue"]).length
      ? supabase.from("revenues").select("id, realized_amount, reconciliation_status").in("id", idsOf(["revenue"]))
      : Promise.resolve({ data: [] as any[] }),
    invIds.length
      ? supabase.from("investments").select("id, applied_amount, redeemed_amount").in("id", invIds)
      : Promise.resolve({ data: [] as any[] }),
    idsOf(["transfer"]).length
      ? supabase.from("transfers").select("id, amount").in("id", idsOf(["transfer"]))
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const paymentMap = new Map<string, any>((payments.data ?? []).map((p: any) => [p.id, p]));
  const revenueMap = new Map<string, any>((revenues.data ?? []).map((r: any) => [r.id, r]));
  const investmentMap = new Map<string, any>((investments.data ?? []).map((i: any) => [i.id, i]));
  const transferMap = new Map<string, any>((transfers.data ?? []).map((t: any) => [t.id, t]));

  const skipped: Skipped[] = [];
  const recRows: any[] = [];
  const doneEntries = new Set<string>();
  const touchedPayments: string[] = [];
  const touchedRevenues: string[] = [];
  const usedEntities = new Set<string>();

  for (const item of items) {
    const first = item.entryIds[0];
    const skip = (reason: string) => skipped.push({ entryId: first, reason });

    if (item.entryIds.length === 0 || item.entityIds.length === 0) { skip("grupo vazio"); continue; }
    if (item.entryIds.length > 1 && item.entityIds.length > 1) { skip("combinação N:N não é suportada"); continue; }
    if (new Set(item.entryIds).size !== item.entryIds.length || new Set(item.entityIds).size !== item.entityIds.length) { skip("itens repetidos no grupo"); continue; }

    let problem: string | null = null;
    let entriesTotal = 0;
    for (const id of item.entryIds) {
      const e = entryMap.get(id);
      if (!e) problem = "linha do extrato não encontrada";
      else if (e.reconciliation_status !== "pendente" || doneEntries.has(id)) problem = "linha já tratada";
      else entriesTotal += Number(e.amount);
      if (problem) break;
    }
    let entitiesTotal = 0;
    if (!problem) {
      for (const id of item.entityIds) {
        if (usedEntities.has(item.entityType + ":" + id)) { problem = "lançamento já usado por outro grupo do lote"; break; }
        if (item.entityType === "payment") {
          const p = paymentMap.get(id);
          if (!p) problem = "pagamento não encontrado";
          else if (p.reconciliation_status !== "pendente") problem = "pagamento já conciliado";
          else entitiesTotal += Number(p.gross_amount);
        } else if (item.entityType === "revenue") {
          const r = revenueMap.get(id);
          if (!r) problem = "receita não encontrada";
          else if (r.reconciliation_status !== "pendente") problem = "receita já conciliada";
          else entitiesTotal += Number(r.realized_amount);
        } else if (item.entityType === "transfer") {
          const t = transferMap.get(id);
          if (!t) problem = "transferência não encontrada";
          else entitiesTotal += Number(t.amount);
        } else {
          const inv = investmentMap.get(id);
          if (!inv) problem = "investimento não encontrado";
          else entitiesTotal += Number(item.entityType === "investment_application" ? inv.applied_amount : inv.redeemed_amount);
        }
        if (problem) break;
      }
    }
    if (problem) { skip(problem); continue; }
    if (cents(entriesTotal) !== cents(entitiesTotal)) {
      skip("valor não fecha (extrato " + entriesTotal.toFixed(2) + " x lançamento " + entitiesTotal.toFixed(2) + ")");
      continue;
    }

    const note =
      item.entryIds.length > 1
        ? item.entryIds.length + " linhas do banco para 1 lançamento"
        : item.entityIds.length > 1
          ? "1 linha do banco para " + item.entityIds.length + " lançamentos"
          : null;
    for (const entryId of item.entryIds) {
      for (const entityId of item.entityIds) {
        recRows.push({
          bank_statement_entry_id: entryId,
          entity_type: item.entityType,
          entity_id: entityId,
          matched_by: user?.id,
          match_type: matchType,
          notes: note,
        });
      }
      doneEntries.add(entryId);
    }
    for (const entityId of item.entityIds) {
      usedEntities.add(item.entityType + ":" + entityId);
      if (item.entityType === "payment") touchedPayments.push(entityId);
      if (item.entityType === "revenue") touchedRevenues.push(entityId);
    }
  }

  if (recRows.length > 0) {
    const { error: recError } = await supabase.from("reconciliations").insert(recRows);
    if (recError) return { error: recError.message, done: 0, skipped };
    await supabase.from("bank_statement_entries").update({ reconciliation_status: "conciliado_manualmente" }).in("id", Array.from(doneEntries));
    if (touchedPayments.length > 0) {
      await supabase.from("payments").update({ reconciliation_status: "conciliado_manualmente" }).in("id", touchedPayments);
    }
    if (touchedRevenues.length > 0) {
      await supabase.from("revenues").update({ reconciliation_status: "conciliado_manualmente" }).in("id", touchedRevenues);
    }
  }

  revalidatePath("/conciliacao");
  revalidatePath("/movimentacoes");
  return { error: null, done: doneEntries.size, skipped };
}

/** Listas para o diálogo "Criar lançamento" (carregadas só quando ele abre). */
export async function loadCreateOptions() {
  const supabase = createClient();
  const [suppliers, payCats, revCats, accounts] = await Promise.all([
    supabase.from("suppliers").select("id, legal_name").neq("status", "inativo").order("legal_name"),
    supabase.from("categories").select("id, name").in("allowed_direction", ["saida", "ambas"]).neq("status", "inativo").order("name"),
    supabase.from("categories").select("id, name").in("allowed_direction", ["entrada", "ambas"]).neq("status", "inativo").order("name"),
    supabase.from("bank_accounts").select("id, nickname, bank_name, company_id").order("nickname"),
  ]);
  return {
    suppliers: (suppliers.data ?? []) as Array<{ id: string; legal_name: string }>,
    paymentCategories: (payCats.data ?? []) as Array<{ id: string; name: string }>,
    revenueCategories: (revCats.data ?? []) as Array<{ id: string; name: string }>,
    accounts: (accounts.data ?? []) as Array<{ id: string; nickname: string | null; bank_name: string; company_id: string }>,
  };
}

/**
 * Cria, a partir de uma linha do extrato SEM PAR, o lançamento que falta no Treasury — já baixado, na
 * conta e na data do próprio extrato — e concilia a linha com ele. Três formas:
 *  - transfer: transferência entre contas (a direção vem da linha: saída = esta conta → a outra);
 *  - payment: pagamento pago (precisa de fornecedor);
 *  - revenue: receita recebida (precisa de categoria).
 * O valor, a data e a conta sempre vêm da linha do banco. A autoria fica com o usuário logado.
 */
export async function createFromEntry(input: {
  entryId: string;
  mode: "transfer" | "payment" | "revenue";
  otherAccountId?: string;
  supplierId?: string;
  categoryId?: string;
  description?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entry } = await supabase
    .from("bank_statement_entries")
    .select("id, bank_account_id, entry_date, amount, direction, bank_description, reconciliation_status")
    .eq("id", input.entryId)
    .single();
  if (!entry) return { error: "Linha do extrato não encontrada." };
  if (entry.reconciliation_status !== "pendente") return { error: "Essa linha já foi tratada." };

  const { data: account } = await supabase.from("bank_accounts").select("id, company_id").eq("id", entry.bank_account_id).single();
  if (!account) return { error: "Conta bancária da linha não encontrada." };

  const amount = Number(entry.amount);
  const date: string = entry.entry_date;
  const description = (input.description ?? "").trim() || entry.bank_description || "Lançamento do extrato";
  let entityType: "payment" | "revenue" | "transfer";
  let entityId: string;

  if (input.mode === "transfer") {
    if (!input.otherAccountId) return { error: "Escolha a outra conta." };
    if (input.otherAccountId === account.id) return { error: "A outra conta precisa ser diferente desta." };
    const { data: other } = await supabase.from("bank_accounts").select("id, company_id").eq("id", input.otherAccountId).single();
    if (!other) return { error: "Outra conta não encontrada." };
    const isOut = entry.direction === "saida";
    const from = isOut ? account : other;
    const to = isOut ? other : account;
    const { data: t, error } = await supabase
      .from("transfers")
      .insert({
        tipo: "transferencia_interna",
        description,
        amount,
        transfer_date: date,
        from_account_id: from.id,
        to_account_id: to.id,
        company_id: from.company_id,
        to_company_id: to.company_id,
        created_by: user?.id,
      })
      .select("id")
      .single();
    if (error || !t) return { error: error?.message ?? "Falha ao criar a transferência." };
    entityType = "transfer";
    entityId = t.id;
  } else if (input.mode === "payment") {
    if (entry.direction !== "saida") return { error: "Pagamento só pode ser criado a partir de uma saída." };
    if (!input.supplierId) return { error: "Escolha o fornecedor." };
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("legal_name, cost_type, cost_structure, chart_account_id")
      .eq("id", input.supplierId)
      .single();
    const { data: p, error } = await supabase
      .from("payments")
      .insert({
        company_id: account.company_id,
        supplier_id: input.supplierId,
        description,
        gross_amount: amount,
        currency: "BRL",
        category_id: input.categoryId || null,
        cost_type: supplier?.cost_type ?? "despesas",
        fixed_variable: supplier?.cost_structure ?? null,
        chart_account_id: supplier?.chart_account_id ?? null,
        paying_bank_account_id: account.id,
        document_date: date,
        due_date: date,
        expected_payment_date: date,
        competence_date: date,
        effective_payment_date: date,
        paid_amount: amount,
        status: "pago",
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select("id")
      .single();
    if (error || !p) return { error: error?.message ?? "Falha ao criar o pagamento." };
    const { error: realError } = await supabase.from("payment_realizations").insert({
      payment_id: p.id,
      amount,
      paid_at: date,
      bank_account_id: account.id,
      created_by: user?.id,
    });
    if (realError) return { error: realError.message };
    entityType = "payment";
    entityId = p.id;
  } else {
    if (entry.direction !== "entrada") return { error: "Receita só pode ser criada a partir de uma entrada." };
    if (!input.categoryId) return { error: "Escolha a categoria da receita." };
    const { data: category } = await supabase.from("categories").select("chart_account_id").eq("id", input.categoryId).single();
    const { data: r, error } = await supabase
      .from("revenues")
      .insert({
        company_id: account.company_id,
        description,
        expected_amount: amount,
        realized_amount: amount,
        category_id: input.categoryId,
        chart_account_id: category?.chart_account_id ?? null,
        expected_date: date,
        realized_date: date,
        receiving_bank_account_id: account.id,
        probability_pct: 100,
        status: "recebida",
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select("id")
      .single();
    if (error || !r) return { error: error?.message ?? "Falha ao criar a receita." };
    const { error: realError } = await supabase.from("revenue_realizations").insert({
      revenue_id: r.id,
      amount,
      received_at: date,
      bank_account_id: account.id,
      created_by: user?.id,
    });
    if (realError) return { error: realError.message };
    entityType = "revenue";
    entityId = r.id;
  }

  const res = await reconcileEntry(input.entryId, entityType, entityId);
  if (res.error) return { error: `Lançamento criado, mas a conciliação falhou: ${res.error}` };

  revalidatePath("/pagamentos");
  revalidatePath("/receitas");
  revalidatePath("/transferencias");
  revalidatePath("/cash-flow");
  revalidatePath("/cash-flow/detalhado");
  return { error: null };
}

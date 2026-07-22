"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierSchema } from "@/lib/validators/registrations";

export async function updateSupplierRecurring(
  supplierId: string,
  data: { recurring_amount: number | null; recurring_week_of_month: number | null }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .update(data)
    .eq("id", supplierId);
  if (error) return { error: error.message };
  revalidatePath("/cadastros/fornecedores");
  revalidatePath("/pagamentos/recorrentes");
  return { error: null };
}

export async function createSupplier(formData: FormData) {
  const parsed = supplierSchema.safeParse({
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id") || "",
    cost_type: formData.get("cost_type") || "despesas",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { tax_id, ...rest } = parsed.data;
  const { error } = await supabase.from("suppliers").insert({
    ...rest,
    tax_id: tax_id || null,
    person_type: "juridica",
    default_category_id: String(formData.get("default_category_id") || "") || null,
    default_cost_center_id: String(formData.get("default_cost_center_id") || "") || null,
    default_description: String(formData.get("default_description") || "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const parsed = supplierSchema.safeParse({
    legal_name: formData.get("legal_name"),
    tax_id: formData.get("tax_id") || "",
    cost_type: formData.get("cost_type") || "despesas",
    status: formData.get("status") || "ativo",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = createClient();
  const { tax_id, ...rest } = parsed.data;

  const defaultDescription = String(formData.get("default_description") || "") || null;
  const isRecurring = formData.get("is_recurring") === "on";
  const recurringAmount = Number(formData.get("recurring_amount") || 0) || null;
  const recurringDayStr = String(formData.get("recurring_day_of_month") || "");
  const recurringDay = recurringDayStr ? Number(recurringDayStr) : null;
  const propagateDescription = formData.get("propagate_description") === "on";

  const { error } = await supabase
    .from("suppliers")
    .update({
      ...rest,
      tax_id: tax_id || null,
      default_category_id: String(formData.get("default_category_id") || "") || null,
      default_cost_center_id: String(formData.get("default_cost_center_id") || "") || null,
      default_description: defaultDescription,
      is_recurring: isRecurring,
      recurring_amount: isRecurring ? recurringAmount : null,
      recurring_day_of_month: isRecurring ? recurringDay : null,
    })
    .eq("id", supplierId);

  if (error) return { error: error.message };

  // Propagar descrição para pagamentos futuros (não pagos) deste fornecedor
  if (propagateDescription && defaultDescription) {
    await supabase
      .from("payments")
      .update({ description: defaultDescription })
      .eq("supplier_id", supplierId)
      .neq("status", "pago")
      .neq("status", "cancelado")
      .is("deleted_at", null);
  }

  revalidatePath("/cadastros/fornecedores");
  revalidatePath("/pagamentos");
  return { error: null };
}

// Semana → dia âncora (ajuste fino via lápis de vencimento)
const WEEK_TO_DAY: Record<number, number> = { 1: 7, 2: 14, 3: 21, 4: 28, 5: 28 };

export async function generateRecurringProvisions(
  supplierId: string,
  companyId: string,
  months: number = 3,
  overrideAmount?: number,
  overrideWeek?: number
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("legal_name, cost_type, default_category_id, default_cost_center_id, default_description, recurring_amount, recurring_week_of_month, is_recurring")
    .eq("id", supplierId)
    .single();

  const effectiveAmount = overrideAmount ?? supplier?.recurring_amount;
  const effectiveWeek = overrideWeek ?? supplier?.recurring_week_of_month;
  const effectiveDay = WEEK_TO_DAY[effectiveWeek ?? 0] ?? null;

  if (!effectiveAmount || !effectiveDay) {
    return { error: "Informe o valor e a semana de vencimento." };
  }

  const today = new Date();
  const created: string[] = [];

  for (let m = 0; m < months; m++) {
    const target = new Date(today.getFullYear(), today.getMonth() + m, effectiveDay);
    const dueDate = target.toISOString().split("T")[0];

    // Verificar se já existe pagamento para esse fornecedor nesse mês
    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("supplier_id", supplierId)
      .eq("company_id", companyId)
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd)
      .is("deleted_at", null)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const description =
      supplier?.default_description || supplier?.legal_name || "Pagamento";

    const { error } = await supabase.from("payments").insert({
      company_id: companyId,
      supplier_id: supplierId,
      description,
      gross_amount: effectiveAmount,
      currency: "BRL",
      category_id: supplier?.default_category_id,
      cost_center_id: supplier?.default_cost_center_id,
      cost_type: supplier?.cost_type ?? "despesas",
      document_date: dueDate,
      due_date: dueDate,
      expected_payment_date: dueDate,
      competence_date: dueDate,
      status: "agendado",
      recurring: true,
      created_by: user?.id,
      updated_by: user?.id,
    });

    if (!error) created.push(dueDate);
  }

  revalidatePath("/pagamentos");
  revalidatePath("/cash-flow");
  return { error: null, created };
}

export async function deleteSupplier(supplierId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);

  if (error) return { error: error.message };

  revalidatePath("/cadastros/fornecedores");
  return { error: null };
}

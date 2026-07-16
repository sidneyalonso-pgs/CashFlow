import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const dueDate = today.toISOString().slice(0, 10);

  const { data: templates, error: templatesError } = await supabase
    .from("recurring_payment_templates")
    .select("*")
    .eq("active", true)
    .eq("day_of_month", dayOfMonth);

  if (templatesError) {
    return NextResponse.json({ error: templatesError.message }, { status: 500 });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const template of templates ?? []) {
    const { error } = await supabase.from("payments").insert({
      company_id: template.company_id,
      supplier_id: template.supplier_id,
      category_id: template.category_id,
      cost_center_id: template.cost_center_id,
      paying_bank_account_id: template.paying_bank_account_id,
      description: template.description,
      currency: "BRL",
      due_date: dueDate,
      recurring: true,
      recurring_template_id: template.id,
      status: "rascunho",
    });

    if (error) {
      // Índice único evita duplicar o lançamento do mesmo template no mesmo mês.
      if (error.code === "23505") skipped.push(template.id);
      else return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      created.push(template.id);
    }
  }

  return NextResponse.json({ date: dueDate, created, skipped });
}

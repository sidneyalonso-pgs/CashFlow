import { createClient } from "@/lib/supabase/server";
import { montaRelatorioReceitas, type RelatorioReceitas } from "./dados";

/** Empresa "Pagsmile IP": o relatório e a provisão de receitas são só dela (outras do grupo, como a Select Credit, ficam de fora). */
export async function carregaReceitasDoMes(
  supabase: ReturnType<typeof createClient>,
  mes: string
): Promise<{ company: { id: string; legal_name: string; trade_name: string | null } | null; rel: RelatorioReceitas | null }> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .or("trade_name.ilike.%Pagsmile IP%,legal_name.ilike.%Pagsmile IP%")
    .limit(1)
    .maybeSingle();
  if (!company) return { company: null, rel: null };

  const REV_BASE = "id, created_at, status, description, realized_amount, realized_date, expected_amount, expected_date, categories(name)";
  const [revComp, payRes] = await Promise.all([
    supabase
      .from("revenues")
      .select(`${REV_BASE}, competence_date`)
      .eq("company_id", company.id)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000),
    supabase
      .from("payments")
      .select("id, status, gross_amount, description, competence_date, due_date, expected_payment_date, effective_payment_date, suppliers(legal_name)")
      .eq("company_id", company.id)
      .in("status", ["pago", "agendado"])
      .is("deleted_at", null)
      .ilike("description", "Repasse%")
      .limit(10000),
  ]);
  // antes da migration 0032 a coluna de competência não existe: cai para a leitura sem ela
  let revenues: any[] = (revComp.data ?? []) as any[];
  if (revComp.error) {
    const { data: simples } = await supabase
      .from("revenues")
      .select(REV_BASE)
      .eq("company_id", company.id)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000);
    revenues = (simples ?? []) as any[];
  }

  // receita que vem de fatura (Bets, mensalidade, China) entra na competência da FATURA, não no mês do recebimento
  const { data: faturas } = await supabase
    .from("billing_invoices")
    .select("revenue_id, payment_id, competencia, inicio, fim")
    .eq("company_id", company.id)
    .neq("status", "cancelado")
    .limit(10000);
  const competenciaFatura = new Map<string, string>();
  const periodoPorPagamento = new Map<string, string>();
  const competenciaPorPagamento = new Map<string, string>();
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  for (const f of (faturas ?? []) as any[]) {
    if (f.revenue_id && /^\d{4}-\d{2}$/.test(f.competencia ?? "")) competenciaFatura.set(f.revenue_id, f.competencia);
    if (f.payment_id && f.inicio && f.fim) periodoPorPagamento.set(f.payment_id, `${dm(f.inicio)} a ${dm(f.fim)}`);
    if (f.payment_id && /^\d{4}-\d{2}$/.test(f.competencia ?? "")) competenciaPorPagamento.set(f.payment_id, f.competencia);
  }

  const rel = montaRelatorioReceitas(mes, revenues, (payRes.data ?? []) as any[], competenciaFatura, periodoPorPagamento, competenciaPorPagamento);
  return { company: company as any, rel };
}

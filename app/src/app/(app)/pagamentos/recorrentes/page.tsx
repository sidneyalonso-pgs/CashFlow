import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RecurringSupplierPanel } from "./RecurringSupplierPanel";

export default async function RecurringPaymentsPage() {
  const supabase = createClient();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const [{ data: companies }, { data: recurringSuppliers }, { data: recentPayments }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase
      .from("suppliers")
      .select("id, legal_name, recurring_amount, recurring_week_of_month, default_description")
      .eq("status", "ativo")
      .eq("is_recurring", true)
      .order("legal_name"),
    // Busca pagamentos dos últimos 2 meses para cada fornecedor recorrente
    supabase
      .from("payments")
      .select("supplier_id, company_id, gross_amount, due_date, status")
      .is("deleted_at", null)
      .gte("due_date", new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0])
      .order("due_date", { ascending: false }),
  ]);

  // Para cada fornecedor+empresa: último valor pago e se já foi lançado no mês atual
  type SupplierCompanyInfo = {
    lastAmount: number | null;
    launchedThisMonth: boolean;
    lastStatus: string | null;
  };
  const paymentInfoMap = new Map<string, SupplierCompanyInfo>();

  for (const p of recentPayments ?? []) {
    const key = `${p.supplier_id}__${p.company_id}`;
    if (!paymentInfoMap.has(key)) {
      const launchedThisMonth = p.due_date >= monthStart && p.due_date <= monthEnd;
      paymentInfoMap.set(key, {
        lastAmount: Number(p.gross_amount),
        launchedThisMonth,
        lastStatus: p.status,
      });
    } else if (p.due_date >= monthStart && p.due_date <= monthEnd) {
      // Atualiza flag se encontrou lançamento do mês atual
      const existing = paymentInfoMap.get(key)!;
      existing.launchedThisMonth = true;
      existing.lastStatus = p.status;
    }
  }

  return (
    <div>
      <PageHeader
        title="Pagamentos recorrentes"
        subtitle="Provisione pagamentos futuros para todos os fornecedores recorrentes com um clique"
        actions={
          <a
            href="/cadastros/fornecedores"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Gerenciar fornecedores →
          </a>
        }
      />

      <RecurringSupplierPanel
        suppliers={recurringSuppliers ?? []}
        companies={companies ?? []}
        paymentInfoMap={Object.fromEntries(paymentInfoMap)}
      />
    </div>
  );
}

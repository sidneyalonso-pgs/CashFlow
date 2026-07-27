import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { RecurringSupplierPanel } from "./RecurringSupplierPanel";

export default async function RecurringPaymentsPage() {
  const supabase = createClient();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];

  const [{ data: companies }, { data: recurringPayments }, { data: allSuppliers }] = await Promise.all([
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    // Pagamentos marcados como recorrentes nos últimos 2 meses
    supabase
      .from("payments")
      .select("id, supplier_id, company_id, gross_amount, due_date, status")
      .eq("recurring", true)
      .is("deleted_at", null)
      .gte("due_date", prevMonthStart)
      .order("due_date", { ascending: false }),
    // Dados dos fornecedores para exibição
    supabase
      .from("suppliers")
      .select("id, legal_name, recurring_amount, recurring_week_of_month, default_description")
      .eq("status", "ativo"),
  ]);

  const suppliersById = new Map((allSuppliers ?? []).map((s) => [s.id, s]));

  // Monta estrutura por empresa: quais fornecedores têm pagamentos recorrentes + último valor + status do mês
  type SupplierInfo = {
    supplierId: string;
    lastAmount: number | null;
    launchedThisMonth: boolean;
    lastStatus: string | null;
  };

  const companySupplierMap = new Map<string, Map<string, SupplierInfo>>();

  for (const p of recurringPayments ?? []) {
    if (!companySupplierMap.has(p.company_id)) {
      companySupplierMap.set(p.company_id, new Map());
    }
    const supplierMap = companySupplierMap.get(p.company_id)!;

    if (!supplierMap.has(p.supplier_id)) {
      // Primeiro registro = o mais recente (já ordenado desc)
      supplierMap.set(p.supplier_id, {
        supplierId: p.supplier_id,
        lastAmount: Number(p.gross_amount),
        launchedThisMonth: p.due_date >= monthStart && p.due_date <= monthEnd,
        lastStatus: p.due_date >= monthStart && p.due_date <= monthEnd ? p.status : null,
      });
    } else if (p.due_date >= monthStart && p.due_date <= monthEnd) {
      // Atualiza flag de mês atual se encontrar lançamento deste mês
      const existing = supplierMap.get(p.supplier_id)!;
      existing.launchedThisMonth = true;
      existing.lastStatus = p.status;
    }
  }

  // Serializa para passar ao client component
  const paymentInfoMap: Record<string, { lastAmount: number | null; launchedThisMonth: boolean; lastStatus: string | null }> = {};
  const companySuppliersMap: Record<string, typeof allSuppliers> = {};

  for (const [companyId, supplierMap] of companySupplierMap.entries()) {
    companySuppliersMap[companyId] = [];
    for (const info of supplierMap.values()) {
      const supplier = suppliersById.get(info.supplierId);
      if (supplier) {
        (companySuppliersMap[companyId] as any[]).push(supplier);
        paymentInfoMap[`${info.supplierId}__${companyId}`] = {
          lastAmount: info.lastAmount,
          launchedThisMonth: info.launchedThisMonth,
          lastStatus: info.lastStatus,
        };
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Pagamentos recorrentes"
        subtitle="Fornecedores com pagamentos marcados como recorrentes, por empresa"
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
        companies={companies ?? []}
        companySuppliersMap={companySuppliersMap as any}
        paymentInfoMap={paymentInfoMap}
      />
    </div>
  );
}

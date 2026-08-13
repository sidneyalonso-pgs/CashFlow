import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { ExpandableTable, type ExpandableRow } from "@/components/ExpandableTable";
import { formatBRL, sumMoney } from "@/lib/calculations/money";

function groupWithItems<T>(
  items: T[],
  keyFn: (item: T) => string,
  amountFn: (item: T) => number,
  itemFn: (item: T) => { label: string; date: string; href?: string }
): ExpandableRow[] {
  const map = new Map<string, { total: number; items: ExpandableRow["items"] }>();
  for (const item of items) {
    const key = keyFn(item);
    const amount = amountFn(item);
    const { label, date, href } = itemFn(item);
    const existing = map.get(key) ?? { total: 0, items: [] };
    existing.total += amount;
    existing.items.push({ label, date, amount, href });
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, total: v.total, items: v.items.sort((a, b) => b.amount - a.amount) }))
    .sort((a, b) => b.total - a.total);
}

export default async function FpaPage({
  searchParams,
}: {
  searchParams: { company_id?: string; from?: string; to?: string };
}) {
  const supabase = createClient();
  const { company_id, from, to } = searchParams;

  let paymentsQuery = supabase
    .from("payments")
    .select("id, gross_amount, competence_date, description, categories(name, fpa_classification), cost_centers(name), suppliers(legal_name), company_id")
    .eq("status", "pago")
    .is("deleted_at", null);
  let revenuesQuery = supabase
    .from("revenues")
    .select("id, realized_amount, realized_date, description, categories(name, fpa_classification), company_id")
    .eq("status", "recebida")
    .is("deleted_at", null);

  if (company_id) {
    paymentsQuery = paymentsQuery.eq("company_id", company_id);
    revenuesQuery = revenuesQuery.eq("company_id", company_id);
  }
  if (from) {
    paymentsQuery = paymentsQuery.gte("competence_date", from);
    revenuesQuery = revenuesQuery.gte("realized_date", from);
  }
  if (to) {
    paymentsQuery = paymentsQuery.lte("competence_date", to);
    revenuesQuery = revenuesQuery.lte("realized_date", to);
  }

  const [{ data: payments }, { data: revenues }, { data: companies }] = await Promise.all([
    paymentsQuery,
    revenuesQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const totalExpenses = sumMoney((payments ?? []).map((p: any) => p.gross_amount));
  const totalRevenue = sumMoney((revenues ?? []).map((r: any) => r.realized_amount));
  const result = totalRevenue.minus(totalExpenses);

  const paymentLabel = (p: any) => p.suppliers?.legal_name ?? p.description ?? "Outros";

  const expensesByCategory = groupWithItems(
    payments ?? [],
    (p: any) => p.categories?.name ?? "Sem categoria",
    (p: any) => Number(p.gross_amount),
    (p: any) => ({ label: paymentLabel(p), date: p.competence_date, href: p.id ? `/pagamentos/${p.id}` : undefined })
  );
  const expensesByCostCenter = groupWithItems(
    payments ?? [],
    (p: any) => p.cost_centers?.name ?? "Sem centro de custo",
    (p: any) => Number(p.gross_amount),
    (p: any) => ({ label: paymentLabel(p), date: p.competence_date, href: p.id ? `/pagamentos/${p.id}` : undefined })
  );
  const expensesByFpaClass = groupWithItems(
    payments ?? [],
    (p: any) => p.categories?.fpa_classification ?? "Não classificado",
    (p: any) => Number(p.gross_amount),
    (p: any) => ({ label: paymentLabel(p), date: p.competence_date, href: p.id ? `/pagamentos/${p.id}` : undefined })
  );
  const revenueByCategory = groupWithItems(
    revenues ?? [],
    (r: any) => r.categories?.name ?? "Sem categoria",
    (r: any) => Number(r.realized_amount),
    (r: any) => ({ label: r.description ?? "Outras", date: r.realized_date, href: r.id ? `/receitas#${r.id}` : undefined })
  );

  return (
    <div>
      <PageHeader title="FP&A" subtitle="Realizado classificado por categoria, centro de custo e natureza" />

      <form className="flex flex-wrap gap-3 mb-6">
        <select
          name="company_id"
          defaultValue={company_id ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={to ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <FinancialCard label="Receita realizada" value={formatBRL(totalRevenue)} tone="positive" />
        <FinancialCard label="Despesa realizada" value={formatBRL(totalExpenses)} tone="negative" />
        <FinancialCard
          label="Resultado"
          value={formatBRL(result)}
          tone={result.isNegative() ? "negative" : "positive"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Despesas por categoria</h3>
          <ExpandableTable rows={expensesByCategory} keyHeader="Categoria" />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Despesas por centro de custo</h3>
          <ExpandableTable rows={expensesByCostCenter} keyHeader="Centro de custo" />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Despesas por classificação FP&A</h3>
          <ExpandableTable rows={expensesByFpaClass} keyHeader="Classificação" />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Receitas por categoria</h3>
          <ExpandableTable rows={revenueByCategory} keyHeader="Categoria" />
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { DataTable } from "@/components/DataTable";
import { formatBRL, sumMoney } from "@/lib/calculations/money";

function groupSum<T>(items: T[], keyFn: (item: T) => string, amountFn: (item: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + amountFn(item));
  }
  return Array.from(map.entries())
    .map(([key, total]) => ({ key, total }))
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
    .select("gross_amount, competence_date, categories(name, fpa_classification), cost_centers(name), company_id")
    .eq("status", "pago")
    .is("deleted_at", null);
  let revenuesQuery = supabase
    .from("revenues")
    .select("realized_amount, realized_date, categories(name, fpa_classification), company_id")
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

  const expensesByCategory = groupSum(
    payments ?? [],
    (p: any) => p.categories?.name ?? "Sem categoria",
    (p: any) => Number(p.gross_amount)
  );
  const expensesByCostCenter = groupSum(
    payments ?? [],
    (p: any) => p.cost_centers?.name ?? "Sem centro de custo",
    (p: any) => Number(p.gross_amount)
  );
  const expensesByFpaClass = groupSum(
    payments ?? [],
    (p: any) => p.categories?.fpa_classification ?? "Não classificado",
    (p: any) => Number(p.gross_amount)
  );
  const revenueByCategory = groupSum(
    revenues ?? [],
    (r: any) => r.categories?.name ?? "Sem categoria",
    (r: any) => Number(r.realized_amount)
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
          <DataTable
            rows={expensesByCategory}
            rowKey={(r) => r.key}
            columns={[
              { header: "Categoria", cell: (r) => r.key },
              { header: "Total", cell: (r) => <span className="tabular-nums">{formatBRL(r.total)}</span> },
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Despesas por centro de custo</h3>
          <DataTable
            rows={expensesByCostCenter}
            rowKey={(r) => r.key}
            columns={[
              { header: "Centro de custo", cell: (r) => r.key },
              { header: "Total", cell: (r) => <span className="tabular-nums">{formatBRL(r.total)}</span> },
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Despesas por classificação FP&A</h3>
          <DataTable
            rows={expensesByFpaClass}
            rowKey={(r) => r.key}
            columns={[
              { header: "Classificação", cell: (r) => r.key },
              { header: "Total", cell: (r) => <span className="tabular-nums">{formatBRL(r.total)}</span> },
            ]}
          />
        </div>
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Receitas por categoria</h3>
          <DataTable
            rows={revenueByCategory}
            rowKey={(r) => r.key}
            columns={[
              { header: "Categoria", cell: (r) => r.key },
              { header: "Total", cell: (r) => <span className="tabular-nums">{formatBRL(r.total)}</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

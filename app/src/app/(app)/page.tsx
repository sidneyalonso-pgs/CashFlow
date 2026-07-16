import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("initial_balance, counts_as_available_cash");

  const { data: overduePayments } = await supabase
    .from("payments")
    .select("id")
    .eq("status", "vencido");

  const availableCash = sumMoney(
    (bankAccounts ?? [])
      .filter((a: any) => a.counts_as_available_cash)
      .map((a: any) => a.initial_balance)
  );

  return (
    <div>
      <PageHeader
        title="Visão geral"
        subtitle="Posição de caixa consolidada e pendências do grupo"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialCard label="Caixa disponível hoje" value={formatBRL(availableCash)} />
        <FinancialCard label="Entradas realizadas (mês)" value={formatBRL(0)} />
        <FinancialCard label="Saídas realizadas (mês)" value={formatBRL(0)} />
        <FinancialCard
          label="Pagamentos vencidos"
          value={String(overduePayments?.length ?? 0)}
          tone={overduePayments && overduePayments.length > 0 ? "negative" : "neutral"}
        />
      </div>
    </div>
  );
}

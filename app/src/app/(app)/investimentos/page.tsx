import { companyLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { NewInvestmentButton } from "./NewInvestmentButton";
import { EditInvestmentButton } from "./EditInvestmentButton";
import { RedeemButton } from "./RedeemButton";

export default async function InvestmentsPage() {
  const supabase = createClient();

  const [{ data: investments }, { data: companies }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("investments")
      .select(
        "id, company_id, bank_account_id, institution, product, applied_amount, applied_date, due_date, liquidity, rate, indexer, redeemed_amount, status, companies(legal_name, trade_name)"
      )
      .order("applied_date", { ascending: false }),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname").order("bank_name"),
  ]);

  const totalPosition = sumMoney(
    (investments ?? [])
      .filter((i: any) => i.status !== "resgatado")
      .map((i: any) => Number(i.applied_amount) - Number(i.redeemed_amount))
  );

  return (
    <div>
      <PageHeader
        title="Investimentos"
        subtitle="Aplicações financeiras e posição investida"
        actions={<NewInvestmentButton companies={companies ?? []} bankAccounts={bankAccounts ?? []} />}
      />

      <div className="mb-6 max-w-xs">
        <FinancialCard label="Posição investida atual" value={formatBRL(totalPosition)} />
      </div>

      <DataTable
        rows={investments ?? []}
        rowKey={(i: any) => i.id}
        columns={[
          { header: "Instituição", cell: (i: any) => <span className="font-medium text-ps-ink">{i.institution}</span> },
          { header: "Produto", cell: (i: any) => i.product },
          { header: "Empresa", cell: (i: any) => companyLabel(i.companies) },
          { header: "Aplicado em", cell: (i: any) => i.applied_date },
          {
            header: "Valor aplicado",
            cell: (i: any) => <span className="tabular-nums">{formatBRL(i.applied_amount)}</span>,
          },
          {
            header: "Saldo atual",
            cell: (i: any) => (
              <span className="tabular-nums">{formatBRL(Number(i.applied_amount) - Number(i.redeemed_amount))}</span>
            ),
          },
          { header: "Status", cell: (i: any) => <StatusBadge status={i.status} /> },
          {
            header: "Ações",
            cell: (i: any) => (
              <div className="flex gap-2">
                <EditInvestmentButton investment={i} companies={companies ?? []} bankAccounts={bankAccounts ?? []} />
                {i.status !== "resgatado" && <RedeemButton investmentId={i.id} />}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { NewBankAccountButton } from "./NewBankAccountButton";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  conta_corrente: "Conta corrente",
  conta_pagamento: "Conta pagamento",
  conta_arrecadadora: "Conta arrecadadora",
  conta_garantia: "Conta garantia",
  conta_investimento: "Conta investimento",
  conta_restrita: "Conta restrita",
  outra: "Outra",
};

export default async function BankAccountsPage() {
  const supabase = createClient();
  const [{ data: accounts }, { data: companies }] = await Promise.all([
    supabase
      .from("bank_accounts")
      .select("id, bank_name, nickname, account_number, account_type, initial_balance, status, company_id, companies(legal_name)")
      .order("bank_name"),
    supabase.from("companies").select("id, legal_name").order("legal_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Contas bancárias"
        subtitle="Contas correntes, de pagamento e investimento do grupo"
        actions={<NewBankAccountButton companies={companies ?? []} />}
      />

      <DataTable
        rows={accounts ?? []}
        rowKey={(a: any) => a.id}
        columns={[
          { header: "Empresa", cell: (a: any) => a.companies?.legal_name ?? "—" },
          { header: "Banco", cell: (a: any) => <span className="font-medium text-ps-ink">{a.bank_name}</span> },
          { header: "Apelido", cell: (a: any) => a.nickname ?? "—" },
          { header: "Conta", cell: (a: any) => <span className="font-mono text-xs">{a.account_number}</span> },
          { header: "Tipo", cell: (a: any) => ACCOUNT_TYPE_LABELS[a.account_type] ?? a.account_type },
          {
            header: "Saldo inicial",
            cell: (a: any) => <span className="tabular-nums">{formatBRL(a.initial_balance)}</span>,
          },
          { header: "Status", cell: (a: any) => <StatusBadge status={a.status} /> },
        ]}
      />
    </div>
  );
}

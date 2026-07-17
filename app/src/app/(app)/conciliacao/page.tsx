import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ReconcileRow } from "./ReconcileRow";
import { ExportReconciliationButton } from "./ExportReconciliationButton";
import { companyLabel } from "@/lib/format";

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: { bank_account_id?: string };
}) {
  const supabase = createClient();
  const bankAccountId = searchParams.bank_account_id;

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, nickname, companies(legal_name, trade_name)")
    .order("bank_name");

  let entries: any[] = [];
  let payments: any[] = [];
  let revenues: any[] = [];

  if (bankAccountId) {
    const [{ data: entriesData }, { data: paymentsData }, { data: revenuesData }] = await Promise.all([
      supabase
        .from("bank_statement_entries")
        .select("id, entry_date, bank_description, amount, direction")
        .eq("bank_account_id", bankAccountId)
        .eq("reconciliation_status", "pendente")
        .order("entry_date"),
      supabase
        .from("payments")
        .select("id, description, gross_amount, effective_payment_date")
        .eq("paying_bank_account_id", bankAccountId)
        .eq("status", "pago")
        .eq("reconciliation_status", "pendente"),
      supabase
        .from("revenues")
        .select("id, description, realized_amount, realized_date")
        .eq("receiving_bank_account_id", bankAccountId)
        .eq("status", "recebida")
        .eq("reconciliation_status", "pendente"),
    ]);
    entries = entriesData ?? [];
    payments = paymentsData ?? [];
    revenues = revenuesData ?? [];
  }

  const paymentCandidates = payments.map((p) => ({
    key: `payment:${p.id}`,
    entityType: "payment" as const,
    entityId: p.id,
    label: p.description,
    amount: Number(p.gross_amount),
    date: p.effective_payment_date,
  }));

  const revenueCandidates = revenues.map((r) => ({
    key: `revenue:${r.id}`,
    entityType: "revenue" as const,
    entityId: r.id,
    label: r.description,
    amount: Number(r.realized_amount),
    date: r.realized_date,
  }));

  return (
    <div>
      <PageHeader
        title="Conciliação"
        subtitle="Concilie o extrato bancário com pagamentos e receitas lançados"
        actions={
          <div className="flex gap-2">
            <ExportReconciliationButton bankAccountId={bankAccountId} />
            <Link
              href="/conciliacao/importar"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              Importar extrato
            </Link>
          </div>
        }
      />

      <form className="flex gap-3 mb-4">
        <select
          name="bank_account_id"
          defaultValue={bankAccountId ?? ""}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione a conta bancária...</option>
          {(bankAccounts ?? []).map((a: any) => (
            <option key={a.id} value={a.id}>
              {companyLabel(a.companies)} — {a.nickname ?? a.bank_name}
            </option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">
          Selecionar
        </button>
      </form>

      {!bankAccountId ? (
        <p className="text-sm text-ps-muted">Selecione uma conta bancária para ver as pendências de conciliação.</p>
      ) : (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Descrição do banco</th>
                <th className="text-left px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Corresponder a</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => (
                <ReconcileRow
                  key={entry.id}
                  entry={entry}
                  candidates={entry.direction === "entrada" ? revenueCandidates : paymentCandidates}
                />
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ps-muted">
                    Nenhuma pendência de conciliação para esta conta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

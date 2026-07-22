import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ReconcileRow } from "./ReconcileRow";
import { ExportReconciliationButton } from "./ExportReconciliationButton";
import { companyLabel } from "@/lib/format";

function monthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: { bank_account_id?: string; month?: string };
}) {
  const supabase = createClient();
  const bankAccountId = searchParams.bank_account_id;

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = searchParams.month ?? defaultMonth;

  const monthStart = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const monthEnd = new Date(year, mon, 0).toISOString().split("T")[0];

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, nickname, companies(legal_name, trade_name)")
    .order("bank_name");

  let entries: any[] = [];
  let payments: any[] = [];
  let revenues: any[] = [];
  let totalEntries = 0;
  let totalPending = 0;

  if (bankAccountId) {
    const [{ data: entriesData }, { data: paymentsData }, { data: revenuesData }, { count: allCount }] =
      await Promise.all([
        supabase
          .from("bank_statement_entries")
          .select("id, entry_date, bank_description, amount, direction")
          .eq("bank_account_id", bankAccountId)
          .eq("reconciliation_status", "pendente")
          .gte("entry_date", monthStart)
          .lte("entry_date", monthEnd)
          .order("entry_date"),
        supabase
          .from("payments")
          .select("id, description, gross_amount, effective_payment_date, due_date")
          .eq("paying_bank_account_id", bankAccountId)
          .eq("status", "pago")
          .eq("reconciliation_status", "pendente")
          .gte("effective_payment_date", monthStart)
          .lte("effective_payment_date", monthEnd),
        supabase
          .from("revenues")
          .select("id, description, realized_amount, realized_date")
          .eq("receiving_bank_account_id", bankAccountId)
          .eq("status", "recebida")
          .eq("reconciliation_status", "pendente")
          .gte("realized_date", monthStart)
          .lte("realized_date", monthEnd),
        supabase
          .from("bank_statement_entries")
          .select("id", { count: "exact", head: true })
          .eq("bank_account_id", bankAccountId)
          .gte("entry_date", monthStart)
          .lte("entry_date", monthEnd),
      ]);

    entries = entriesData ?? [];
    payments = paymentsData ?? [];
    revenues = revenuesData ?? [];
    totalEntries = allCount ?? 0;
    totalPending = entries.length;
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

  const months = monthOptions();
  const currentMonthLabel = months.find((m) => m.value === month)?.label ?? month;
  const conciliado = totalEntries - totalPending;
  const pct = totalEntries > 0 ? Math.round((conciliado / totalEntries) * 100) : 0;

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

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 mb-5">
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

        <select
          name="month"
          defaultValue={month}
          className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        <button className="text-sm text-ps-navy underline" type="submit">
          Filtrar
        </button>
      </form>

      {!bankAccountId ? (
        <p className="text-sm text-ps-muted">Selecione uma conta bancária para ver as pendências de conciliação.</p>
      ) : (
        <>
          {/* Progresso do mês */}
          {totalEntries > 0 && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-ps-ink">{currentMonthLabel}</span>
                <span className="text-sm text-ps-muted">
                  <span className="font-semibold text-ps-green">{conciliado}</span> de {totalEntries} conciliados
                  {" "}<span className="text-xs">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 bg-ps-bg-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ps-green rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {totalPending === 0 && (
                <p className="text-xs text-ps-green font-medium mt-2">✓ Todos os lançamentos deste mês foram conciliados!</p>
              )}
            </div>
          )}

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
                      {totalEntries === 0
                        ? "Nenhum extrato importado para este mês. Importe o extrato do banco para começar."
                        : "Todos os lançamentos deste mês já foram conciliados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

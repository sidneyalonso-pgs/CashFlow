import { companyLabel } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { formatBRL } from "@/lib/calculations/money";
import { scopeAccounts, transferDirection } from "@/lib/calculations/transfers";
import { PaymentsDetailTable } from "./PaymentsDetailTable";

const TIPO_LABELS: Record<string, string> = {
  pix_enviado: "Pix enviado",
  pix_recebido: "Pix recebido",
  ted_enviado: "TED enviado",
  ted_recebido: "TED recebido",
  reembolso: "Reembolso",
  debito_bancario: "Débito bancário",
};

export default async function CashFlowDetailPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string; company_id?: string; label?: string; bank_account_id?: string };
}) {
  const { start, end, company_id: companyId, label, bank_account_id: bankAccountId } = searchParams;

  if (!start || !end) {
    return (
      <div>
        <PageHeader title="Detalhe do período" subtitle="Período inválido" />
        <Link href="/cash-flow" className="text-sm text-ps-navy underline">
          Voltar ao Cash Flow
        </Link>
      </div>
    );
  }

  const supabase = createClient();

  let paymentsQuery = supabase
    .from("payment_realizations")
    .select("id, amount, paid_at, payments!inner(id, description, company_id, companies(legal_name, trade_name), suppliers(legal_name))")
    .is("payments.deleted_at", null)
    .gte("paid_at", start)
    .lte("paid_at", end)
    .order("paid_at");

  let revenuesQuery = supabase
    .from("revenue_realizations")
    .select("id, amount, received_at, revenues!inner(id, description, company_id, companies(legal_name, trade_name), categories(name))")
    .is("revenues.deleted_at", null)
    .gte("received_at", start)
    .lte("received_at", end)
    .order("received_at");

  let investmentsQuery = supabase
    .from("investments")
    .select("id, tipo, product, applied_amount, applied_date, is_opening_balance, companies(legal_name, trade_name)")
    .gte("applied_date", start)
    .lte("applied_date", end)
    .order("applied_date");

  let transfersQuery = supabase
    .from("transfers")
    .select("id, tipo, amount, transfer_date, counterpart_name, description, from_account_id, to_account_id, company_id, to_company_id, companies!transfers_company_id_fkey(legal_name, trade_name), from_account:bank_accounts!transfers_from_account_id_fkey(nickname), to_account:bank_accounts!transfers_to_account_id_fkey(nickname)")
    .gte("transfer_date", start)
    .lte("transfer_date", end)
    .order("transfer_date");

  if (companyId) {
    paymentsQuery = paymentsQuery.eq("payments.company_id", companyId);
    revenuesQuery = revenuesQuery.eq("revenues.company_id", companyId);
    investmentsQuery = investmentsQuery.eq("company_id", companyId);
    // transferência entre empresas do grupo precisa aparecer nos dois lados: quem enviou
    // (company_id) e quem recebeu (to_company_id)
    transfersQuery = transfersQuery.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);
  }
  if (bankAccountId) {
    paymentsQuery = paymentsQuery.eq("payments.paying_bank_account_id", bankAccountId);
    revenuesQuery = revenuesQuery.eq("revenues.receiving_bank_account_id", bankAccountId);
    investmentsQuery = investmentsQuery.eq("bank_account_id", bankAccountId);
  }

  let scopeAccountsQuery = supabase.from("bank_accounts").select("id");
  if (companyId) scopeAccountsQuery = scopeAccountsQuery.eq("company_id", companyId);

  const [{ data: paymentRealizations }, { data: revenueRealizations }, { data: investments }, { data: transfersRaw }, { data: companyAccounts }] =
    await Promise.all([paymentsQuery, revenuesQuery, investmentsQuery, transfersQuery, scopeAccountsQuery]);

  const scopeAccountIds = scopeAccounts(bankAccountId, (companyAccounts ?? []) as { id: string }[]);
  const { isInflow: isTransferIn, isOutflow: isTransferOut } = transferDirection(scopeAccountIds, companyId);
  const allTransfers = (transfersRaw ?? []) as any[];
  const transfersInflows = allTransfers.filter(isTransferIn);
  const transfersOutflows = allTransfers.filter(isTransferOut);

  const resgates = (investments ?? []).filter((i: any) => i.tipo === "resgate");
  const aplicacoes = (investments ?? []).filter((i: any) => i.tipo === "aplicacao" && !i.is_opening_balance);

  return (
    <div>
      <PageHeader
        title={label ? `Detalhe — ${label}` : "Detalhe do período"}
        subtitle={`${formatShort(start)} a ${formatShort(end)}`}
        actions={
          <Link
            href="/cash-flow"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar ao Cash Flow
          </Link>
        }
      />

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Saídas (pagamentos realizados)</h3>
          <PaymentsDetailTable
            rows={(paymentRealizations ?? []).map((r: any) => ({
              id: r.id,
              amount: Number(r.amount),
              paid_at: r.paid_at,
              paymentId: r.payments?.id ?? "",
              description: r.payments?.description ?? "—",
              company: companyLabel(r.payments?.companies),
              supplier: r.payments?.suppliers?.legal_name ?? "—",
            }))}
          />
        </div>

        {transfersOutflows.length > 0 && (
          <div>
            <h3 className="font-semibold text-ps-ink mb-2">Saídas (transferências)</h3>
            <DataTable
              rows={transfersOutflows}
              rowKey={(r: any) => r.id}
              columns={[
                { header: "Tipo", cell: (r: any) => TIPO_LABELS[r.tipo] ?? r.tipo },
                { header: "Empresa", cell: (r: any) => companyLabel(r.companies) },
                { header: "Para / Descrição", cell: (r: any) => r.counterpart_name ?? r.description ?? "—" },
                { header: "Conta débito", cell: (r: any) => (r.from_account as any)?.nickname ?? "—" },
                { header: "Data", cell: (r: any) => r.transfer_date },
                { header: "Valor", cell: (r: any) => <span className="tabular-nums text-red-600">{formatBRL(r.amount)}</span> },
              ]}
            />
          </div>
        )}

        {aplicacoes.length > 0 && (
          <div>
            <h3 className="font-semibold text-ps-ink mb-2">Saídas (aplicações em investimentos)</h3>
            <DataTable
              rows={aplicacoes}
              rowKey={(r: any) => r.id}
              columns={[
                { header: "Produto", cell: (r: any) => r.product },
                { header: "Empresa", cell: (r: any) => companyLabel(r.companies) },
                { header: "Data", cell: (r: any) => r.applied_date },
                { header: "Valor", cell: (r: any) => <span className="tabular-nums text-red-600">{formatBRL(r.applied_amount)}</span> },
              ]}
            />
          </div>
        )}

        <div>
          <h3 className="font-semibold text-ps-ink mb-2">Entradas (receitas recebidas)</h3>
          <DataTable
            rows={revenueRealizations ?? []}
            rowKey={(r: any) => r.id}
            emptyMessage="Nenhuma receita recebida neste período."
            columns={[
              { header: "Descrição", cell: (r: any) => r.revenues?.description },
              { header: "Empresa", cell: (r: any) => companyLabel(r.revenues?.companies) },
              { header: "Categoria", cell: (r: any) => r.revenues?.categories?.name ?? "—" },
              { header: "Data", cell: (r: any) => r.received_at },
              { header: "Valor", cell: (r: any) => <span className="tabular-nums text-ps-green-700">{formatBRL(r.amount)}</span> },
            ]}
          />
        </div>

        {transfersInflows.length > 0 && (
          <div>
            <h3 className="font-semibold text-ps-ink mb-2">Entradas (transferências)</h3>
            <DataTable
              rows={transfersInflows}
              rowKey={(r: any) => r.id}
              columns={[
                { header: "Tipo", cell: (r: any) => TIPO_LABELS[r.tipo] ?? r.tipo },
                { header: "Empresa", cell: (r: any) => companyLabel(r.companies) },
                { header: "De / Descrição", cell: (r: any) => r.counterpart_name ?? r.description ?? "—" },
                { header: "Conta crédito", cell: (r: any) => (r.to_account as any)?.nickname ?? "—" },
                { header: "Data", cell: (r: any) => r.transfer_date },
                { header: "Valor", cell: (r: any) => <span className="tabular-nums text-ps-green-700">{formatBRL(r.amount)}</span> },
              ]}
            />
          </div>
        )}

        {resgates.length > 0 && (
          <div>
            <h3 className="font-semibold text-ps-ink mb-2">Entradas (resgates de investimentos)</h3>
            <DataTable
              rows={resgates}
              rowKey={(r: any) => r.id}
              columns={[
                { header: "Produto", cell: (r: any) => r.product },
                { header: "Empresa", cell: (r: any) => companyLabel(r.companies) },
                { header: "Data", cell: (r: any) => r.applied_date },
                { header: "Valor", cell: (r: any) => <span className="tabular-nums text-ps-green-700">{formatBRL(r.applied_amount)}</span> },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

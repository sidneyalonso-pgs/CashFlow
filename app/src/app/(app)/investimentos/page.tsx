import { companyLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";
import { NewInvestmentButton } from "./NewInvestmentButton";
import { DeleteInvestmentButton } from "./DeleteInvestmentButton";

export default async function InvestmentsPage() {
  const supabase = createClient();

  const [{ data: investments }, { data: companies }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("investments")
      .select("id, tipo, product, applied_amount, applied_date, is_opening_balance, companies(legal_name, trade_name), bank_accounts(bank_name, nickname)")
      .order("applied_date", { ascending: false }),
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, bank_name, nickname, company_id").order("bank_name"),
  ]);

  const aplicacoes = (investments ?? []).filter((i: any) => i.tipo === "aplicacao" || !i.tipo);
  const resgates = (investments ?? []).filter((i: any) => i.tipo === "resgate");

  const totalAplicado = aplicacoes.reduce((s: number, i: any) => s + Number(i.applied_amount), 0);
  const totalResgatado = resgates.reduce((s: number, i: any) => s + Number(i.applied_amount), 0);
  const posicao = totalAplicado - totalResgatado;

  const thCls = "text-left px-4 py-3 text-xs uppercase tracking-wide text-ps-muted whitespace-nowrap";

  function InvTable({ rows, tipo }: { rows: any[]; tipo: "aplicacao" | "resgate" }) {
    if (rows.length === 0) return <p className="text-sm text-ps-muted px-4 pb-4">Nenhum lançamento.</p>;
    return (
      <table className="w-full text-sm">
        <thead className="bg-ps-bg-2">
          <tr>
            <th className={thCls}>Empresa</th>
            <th className={thCls}>Conta</th>
            <th className={thCls}>Produto</th>
            <th className={thCls}>Valor</th>
            <th className={thCls}>Data</th>
            <th className={thCls}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i: any) => (
            <tr key={i.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40">
              <td className="px-4 py-3">{companyLabel(i.companies)}</td>
              <td className="px-4 py-3 text-ps-muted">{i.bank_accounts?.nickname ?? i.bank_accounts?.bank_name ?? "—"}</td>
              <td className="px-4 py-3 font-medium">
                {i.product}
                {tipo === "aplicacao" && i.is_opening_balance && (
                  <span className="ml-2 text-xs text-ps-muted border border-ps-navy/20 rounded px-1">saldo inicial</span>
                )}
              </td>
              <td className="px-4 py-3 tabular-nums font-medium">
                {formatBRL(i.applied_amount)}
              </td>
              <td className="px-4 py-3 text-ps-muted">{i.applied_date}</td>
              <td className="px-4 py-3">
                <DeleteInvestmentButton investmentId={i.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div>
      <PageHeader
        title="Investimentos"
        subtitle="Aplicações e resgates financeiros"
        actions={<NewInvestmentButton companies={companies ?? []} bankAccounts={bankAccounts ?? []} />}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted mb-1">Total aplicado</p>
          <p className="text-lg font-semibold tabular-nums">{formatBRL(totalAplicado)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted mb-1">Total resgatado</p>
          <p className="text-lg font-semibold text-ps-green-700 tabular-nums">+{formatBRL(totalResgatado)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted mb-1">Posição líquida</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatBRL(Math.abs(posicao))}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-ps-ink">Aplicações</span>
            <span className="text-xs text-ps-muted">(saída de caixa)</span>
          </div>
          <InvTable rows={aplicacoes} tipo="aplicacao" />
        </div>

        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-ps-ink">Resgates</span>
            <span className="text-xs text-ps-muted">(entrada de caixa)</span>
          </div>
          <InvTable rows={resgates} tipo="resgate" />
        </div>
      </div>
    </div>
  );
}

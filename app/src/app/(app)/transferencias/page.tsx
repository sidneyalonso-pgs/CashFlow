import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { NewTransferButton } from "./NewTransferButton";
import { DeleteTransferButton } from "./DeleteTransferButton";
import { formatBRL } from "@/lib/calculations/money";

const TIPO_LABELS: Record<string, string> = {
  pix_enviado: "Pix enviado",
  pix_recebido: "Pix recebido",
  ted_enviado: "TED enviado",
  ted_recebido: "TED recebido",
  transferencia_interna: "Transf. interna",
  reembolso: "Reembolso",
  debito_bancario: "Débito bancário",
  outro: "Outro",
};

export default async function TransferenciasPage({
  searchParams,
}: {
  searchParams: { company_id?: string; mes?: string };
}) {
  const supabase = createClient();

  const today = new Date();
  const [refYear, refMonth] = (searchParams.mes ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`)
    .split("-").map(Number);
  const monthStart = `${refYear}-${String(refMonth).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(refYear, refMonth, 0)).toISOString().slice(0, 10);
  const companyId = searchParams.company_id;

  let query = supabase
    .from("transfers")
    .select("id, tipo, description, amount, transfer_date, counterpart_name, company_id, to_company_id, from_account_id, to_account_id, companies!transfers_company_id_fkey(trade_name, legal_name), to_company:companies!transfers_to_company_id_fkey(trade_name, legal_name), from_account:bank_accounts!transfers_from_account_id_fkey(nickname, bank_name), to_account:bank_accounts!transfers_to_account_id_fkey(nickname, bank_name)")
    .gte("transfer_date", monthStart)
    .lte("transfer_date", monthEnd)
    .order("transfer_date", { ascending: false });

  if (companyId) query = query.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);

  const [{ data: transfers }, { data: companies }, { data: bankAccounts }] = await Promise.all([
    query,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("bank_accounts").select("id, nickname, bank_name, companies(trade_name, legal_name)").order("nickname"),
  ]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: `${refYear}-${String(i + 1).padStart(2, "0")}`,
    label: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i],
  }));

  const totalEnviado = (transfers ?? [])
    .filter((t: any) => t.tipo.includes("enviado") || t.tipo === "debito_bancario" || t.tipo === "transferencia_interna" || t.tipo === "reembolso")
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  const totalRecebido = (transfers ?? [])
    .filter((t: any) => t.tipo.includes("recebido"))
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  return (
    <div>
      <PageHeader
        title="Transferências"
        subtitle="Pix, TED, débitos bancários e transferências entre contas"
        actions={
          <NewTransferButton
            companies={companies ?? []}
            bankAccounts={(bankAccounts ?? []).map((a: any) => ({
              id: a.id,
              name: a.nickname,
              bank_name: a.bank_name,
              company_name: a.companies?.trade_name || a.companies?.legal_name || null,
            }))}
          />
        }
      />

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 mb-6">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
        <select name="mes" defaultValue={`${refYear}-${String(refMonth).padStart(2, "0")}`} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}/{refYear}</option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
      </form>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Total enviado / debitado</p>
          <p className="text-xl font-semibold tabular-nums text-red-600">{formatBRL(totalEnviado)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Total recebido</p>
          <p className="text-xl font-semibold tabular-nums text-ps-green-700">{formatBRL(totalRecebido)}</p>
        </div>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
          <p className="text-xs text-ps-muted uppercase tracking-wide mb-1">Lançamentos</p>
          <p className="text-xl font-semibold tabular-nums">{(transfers ?? []).length}</p>
        </div>
      </div>

      <DataTable
        rows={transfers ?? []}
        rowKey={(r: any) => r.id}
        emptyMessage="Nenhuma transferência lançada neste mês."
        columns={[
          {
            header: "Data",
            cell: (r: any) => <span className="tabular-nums text-ps-muted text-xs">{r.transfer_date}</span>,
          },
          {
            header: "Tipo",
            cell: (r: any) => (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                r.tipo.includes("recebido") ? "bg-green-50 text-green-700" :
                r.tipo === "transferencia_interna" ? "bg-blue-50 text-blue-700" :
                r.tipo === "reembolso" ? "bg-orange-50 text-orange-700" :
                "bg-red-50 text-red-700"
              }`}>
                {TIPO_LABELS[r.tipo] ?? r.tipo}
              </span>
            ),
          },
          {
            header: "Empresa",
            cell: (r: any) => <span className="text-sm">{(r.companies as any)?.trade_name || (r.companies as any)?.legal_name}</span>,
          },
          {
            header: "Para / De",
            cell: (r: any) => {
              if (r.tipo === "transferencia_interna") {
                const from = r.companies as any;
                const to = (r as any).to_company;
                const fromName = from?.trade_name || from?.legal_name || "?";
                const toName = to?.trade_name || to?.legal_name || "?";
                return (
                  <span className="text-sm text-ps-muted">
                    De <strong className="text-ps-ink">{fromName}</strong> → Para <strong className="text-ps-ink">{toName}</strong>
                  </span>
                );
              }
              return <span className="text-sm">{r.counterpart_name ?? "—"}</span>;
            },
          },
          {
            header: "Descrição",
            cell: (r: any) => <span className="text-sm text-ps-muted">{r.description ?? "—"}</span>,
          },
          {
            header: "Conta débito",
            cell: (r: any) => {
              const acc = r.from_account as any;
              return <span className="text-xs text-ps-muted">{acc ? `${acc.nickname}${acc.bank_name ? ` — ${acc.bank_name}` : ""}` : "—"}</span>;
            },
          },
          {
            header: "Conta crédito",
            cell: (r: any) => {
              const acc = r.to_account as any;
              return <span className="text-xs text-ps-muted">{acc ? `${acc.nickname}${acc.bank_name ? ` — ${acc.bank_name}` : ""}` : "—"}</span>;
            },
          },
          {
            header: "Valor",
            cell: (r: any) => (
              <span className={`tabular-nums font-medium ${r.tipo.includes("recebido") ? "text-ps-green-700" : "text-red-600"}`}>
                {formatBRL(Number(r.amount))}
              </span>
            ),
          },
          {
            header: "",
            cell: (r: any) => <DeleteTransferButton id={r.id} />,
          },
        ]}
      />
    </div>
  );
}

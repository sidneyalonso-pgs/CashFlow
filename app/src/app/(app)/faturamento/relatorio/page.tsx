import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { formatBRL } from "@/lib/calculations/money";
import { ExportMonthlyReportButton } from "./ExportMonthlyReportButton";

// mesma regra da tela "Faturas emitidas": nesses modelos a PagSmile fica com o valor
// inteiro (não há repasse a terceiro) — mantido igual para os dois relatórios baterem
const NO_REPASSE_MODELS = ["mensalidade", "mensalidade_intro", "bet", "bets"];
const isMensalidade = (modelo: string) => modelo?.startsWith("mensalidade");

function psValues(inv: { modelo: string; total: number; total_faturado: number; total_repasse: number }) {
  const noRepasse = NO_REPASSE_MODELS.includes(inv.modelo);
  const receita = noRepasse ? Number(inv.total) : Number(inv.total_faturado) - Number(inv.total_repasse);
  const repasse = noRepasse ? 0 : Number(inv.total_repasse);
  return { receita, repasse };
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export default async function RelatorioFaturamentoPage({
  searchParams,
}: {
  searchParams: { mes?: string; company_id?: string };
}) {
  const supabase = createClient();
  const mes = searchParams.mes ?? new Date().toISOString().slice(0, 7);
  const [ano, mesNum] = mes.split("-").map(Number);
  const from = `${mes}-01`;
  const to = new Date(Date.UTC(ano, mesNum, 0)).toISOString().slice(0, 10);

  let invoicesQuery = supabase
    .from("billing_invoices")
    .select("id, client_id, company_id, competencia, modelo, total, total_faturado, total_repasse, data_pgto, billing_clients(razao)")
    .eq("status", "pago")
    .gte("data_pgto", from)
    .lte("data_pgto", to)
    .order("data_pgto");

  if (searchParams.company_id) invoicesQuery = invoicesQuery.eq("company_id", searchParams.company_id);

  const [{ data: invoices }, { data: companies }] = await Promise.all([
    invoicesQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const rows = (invoices ?? []).map((r: any) => ({ ...r, ...psValues(r) }));

  const repasses = rows.filter((r: any) => r.repasse > 0);
  const mensalidades = rows.filter((r: any) => isMensalidade(r.modelo) && r.receita > 0);
  const outrasReceitas = rows.filter((r: any) => !isMensalidade(r.modelo) && r.receita > 0);

  const totalRepasse = repasses.reduce((s: number, r: any) => s + r.repasse, 0);
  const totalMensalidade = mensalidades.reduce((s: number, r: any) => s + r.receita, 0);
  const totalOutras = outrasReceitas.reduce((s: number, r: any) => s + r.receita, 0);
  const totalRecebido = totalMensalidade + totalOutras;

  const [label] = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].slice(mesNum - 1, mesNum);

  return (
    <div>
      <PageHeader
        title="Relatório mensal de faturamento"
        subtitle="Repasses pagos e valores recebidos no mês, com as datas de baixa — pronto para repassar à contabilidade"
        actions={
          <Link href="/faturamento" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
            Voltar
          </Link>
        }
      />

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-6">
        <input type="month" name="mes" defaultValue={mes} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white" />
        <select name="company_id" defaultValue={searchParams.company_id ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Todas as empresas</option>
          {(companies ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
        <ExportMonthlyReportButton mes={mes} companyId={searchParams.company_id} />
      </AutoSubmitForm>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-red-400 bg-white p-5">
          <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-1">Repasse pago em {label}</p>
          <p className="text-2xl font-bold text-ps-ink tabular-nums">{formatBRL(totalRepasse)}</p>
          <p className="text-xs text-ps-muted mt-1">{repasses.length} fatura{repasses.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-ps-green bg-white p-5">
          <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-1">Mensalidade recebida em {label}</p>
          <p className="text-2xl font-bold text-ps-ink tabular-nums">{formatBRL(totalMensalidade)}</p>
          <p className="text-xs text-ps-muted mt-1">{mensalidades.length} fatura{mensalidades.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-blue-400 bg-white p-5">
          <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-1">Total recebido em {label}</p>
          <p className="text-2xl font-bold text-ps-ink tabular-nums">{formatBRL(totalRecebido)}</p>
          <p className="text-xs text-ps-muted mt-1">mensalidade + demais faturas</p>
        </div>
      </div>

      <Secao titulo="Repasses pagos no mês" rows={repasses} valorLabel="Valor repassado" total={totalRepasse} vazio="Nenhum repasse baixado nesse mês." />
      <Secao titulo="Mensalidades recebidas" rows={mensalidades} valorLabel="Valor recebido" total={totalMensalidade} vazio="Nenhuma mensalidade baixada nesse mês." />
      <Secao titulo="Outras receitas recebidas (bets/transação)" rows={outrasReceitas} valorLabel="Valor recebido" total={totalOutras} vazio="Nenhuma outra receita baixada nesse mês." />

      <p className="text-xs text-ps-muted mt-2">
        Os valores acima são a data e o valor da baixa de cada fatura (quando você deu "Dar baixa" nela),
        não a data de emissão nem a de vencimento. Repasse é o valor que saiu para o parceiro; nos modelos
        de mensalidade e bets não há repasse — o valor inteiro é receita.
      </p>
    </div>
  );
}

function Secao({
  titulo,
  rows,
  valorLabel,
  total,
  vazio,
}: {
  titulo: string;
  rows: any[];
  valorLabel: string;
  total: number;
  vazio: string;
}) {
  return (
    <div className="mb-8">
      <h3 className="font-semibold text-ps-ink mb-2">{titulo}</h3>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ps-muted">{vazio}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ps-bg-2 text-ps-muted text-[10px] uppercase tracking-wider font-mono">
              <tr>
                <th className="text-left px-4 py-2.5">Data da baixa</th>
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-left px-4 py-2.5">Competência</th>
                <th className="text-right px-4 py-2.5">{valorLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-ps-navy/5">
                  <td className="px-4 py-2.5">
                    <Link href={`/faturamento/${r.id}`} className="text-ps-navy underline decoration-dotted hover:decoration-solid">
                      {dataBR(r.data_pgto)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{r.billing_clients?.razao ?? "—"}</td>
                  <td className="px-4 py-2.5">{r.competencia}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatBRL(r.repasse > 0 ? r.repasse : r.receita)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ps-navy bg-ps-bg-2/60 font-bold text-ps-ink">
                <td colSpan={3} className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

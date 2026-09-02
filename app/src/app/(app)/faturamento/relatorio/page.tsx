import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { formatBRL } from "@/lib/calculations/money";
import { ExportMonthlyReportButton } from "./ExportMonthlyReportButton";

// mesma regra da tela "Faturas emitidas": nesses modelos a PagSmile fica com o valor
// inteiro (não há repasse a terceiro) — mantido igual para os relatórios baterem
const NO_REPASSE_MODELS = ["mensalidade", "mensalidade_intro", "bet", "bets"];
const isMensalidade = (modelo: string) => modelo?.startsWith("mensalidade");
const isBets = (modelo: string) => modelo === "bet" || modelo === "bets";

function psValues(inv: { modelo: string; total: number; total_faturado: number; total_repasse: number }) {
  const noRepasse = NO_REPASSE_MODELS.includes(inv.modelo);
  const receita = noRepasse ? Number(inv.total) : Number(inv.total_faturado) - Number(inv.total_repasse);
  const repasse = noRepasse ? 0 : Number(inv.total_repasse);
  return { receita, repasse };
}

/** Data que representa o lançamento no mês: a baixa se já saiu, senão a expectativa. */
function dataOperativa(inv: { status: string; data_pgto: string | null; data_vencimento: string | null; data_repasse: string | null; competencia: string }) {
  if (inv.status === "pago" && inv.data_pgto) return inv.data_pgto;
  return inv.data_vencimento ?? inv.data_repasse ?? `${inv.competencia}-01`;
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export default async function RelatorioFaturamentoPage({
  searchParams,
}: {
  searchParams: { mes?: string; company_id?: string; modo?: string };
}) {
  const supabase = createClient();
  const mes = searchParams.mes ?? new Date().toISOString().slice(0, 7);
  const modo = searchParams.modo === "competencia" ? "competencia" : "periodo";
  const [ano, mesNum] = mes.split("-").map(Number);
  const from = `${mes}-01`;
  const to = new Date(Date.UTC(ano, mesNum, 0)).toISOString().slice(0, 10);

  // busca provisionado + pago sem recorte de data — o recorte é feito em memória pela
  // dataOperativa (baixa se já pago, senão a expectativa), que não dá pra fazer só com filtro SQL
  let invoicesQuery = supabase
    .from("billing_invoices")
    .select("id, client_id, company_id, competencia, modelo, status, total, total_faturado, total_repasse, data_pgto, data_vencimento, data_repasse, billing_clients(razao)")
    .in("status", ["pago", "pendente"]);

  if (searchParams.company_id) invoicesQuery = invoicesQuery.eq("company_id", searchParams.company_id);

  const [{ data: invoicesRaw }, { data: companies }] = await Promise.all([
    invoicesQuery,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
  ]);

  const rows = (invoicesRaw ?? [])
    .map((r: any) => ({ ...r, ...psValues(r), data: dataOperativa(r) }))
    .filter((r: any) => (modo === "competencia" ? r.competencia === mes : r.data >= from && r.data <= to))
    .sort((a: any, b: any) => a.data.localeCompare(b.data));

  const repasses = rows.filter((r: any) => r.repasse > 0);
  const mensalidades = rows.filter((r: any) => isMensalidade(r.modelo) && r.receita > 0);
  // transação fica de fora: o fee dela já é reconhecido diariamente (CCME/FEE) — contar aqui
  // também seria receita em dobro. Só bets é receita de verdade da fatura.
  const outrasReceitas = rows.filter((r: any) => isBets(r.modelo) && r.receita > 0);

  const [label] = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].slice(mesNum - 1, mesNum);

  return (
    <div>
      <PageHeader
        title="Relatório mensal de faturamento"
        subtitle="Repasses e receitas do mês, provisionados e já baixados — pronto para repassar à contabilidade"
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
        <select name="modo" defaultValue={modo} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="periodo">Filtrar por período de repasse</option>
          <option value="competencia">Filtrar por competência</option>
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
        <ExportMonthlyReportButton mes={mes} companyId={searchParams.company_id} modo={modo} />
      </AutoSubmitForm>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <ResumoCard titulo={`Repasses em ${label}`} rows={repasses} campo="repasse" tone="red" rotuloPago="repassado" />
        <ResumoCard titulo={`Mensalidades em ${label}`} rows={mensalidades} campo="receita" tone="green" rotuloPago="recebido" />
        <ResumoCard titulo={`Bets em ${label}`} rows={outrasReceitas} campo="receita" tone="blue" rotuloPago="recebido" />
      </div>

      <Secao titulo="Repasses no mês" rows={repasses} campo="repasse" valorLabel="Valor do repasse" rotuloPago="Repassado" vazio="Nenhum repasse provisionado ou pago nesse mês." />
      <Secao titulo="Mensalidades" rows={mensalidades} campo="receita" valorLabel="Valor" rotuloPago="Recebido" vazio="Nenhuma mensalidade provisionada ou recebida nesse mês." />
      <Secao titulo="Bets — receita recebida" rows={outrasReceitas} campo="receita" valorLabel="Valor" rotuloPago="Recebido" vazio="Nenhuma fatura de bets provisionada ou recebida nesse mês." />

      <p className="text-xs text-ps-muted mt-2">
        {modo === "competencia" ? (
          <>Filtro por <strong>competência</strong>: mostra toda fatura cuja competência é {mes}, mesmo que a baixa ou o vencimento caia em outro mês.</>
        ) : (
          <>Filtro por <strong>período de repasse</strong>: cada linha usa a data da baixa quando já foi paga, ou a data de vencimento quando ainda está pendente — por isso uma fatura de competência diferente pode aparecer aqui se o repasse cai nesse mês. Troque para "competência" acima se quiser ver pelo mês a que a fatura se refere.</>
        )}{" "}
        Faturas de transação não entram em "receita": o fee delas já é reconhecido diariamente pelo
        CCME/FEE, e listar aqui de novo contaria a mesma receita duas vezes. O repasse da transação
        continua entrando normalmente na primeira seção.
      </p>
    </div>
  );
}

function ResumoCard({
  titulo,
  rows,
  campo,
  tone,
  rotuloPago,
}: {
  titulo: string;
  rows: any[];
  campo: "repasse" | "receita";
  tone: "red" | "green" | "blue";
  rotuloPago: string;
}) {
  const pago = rows.filter((r) => r.status === "pago").reduce((s, r) => s + r[campo], 0);
  const pendente = rows.filter((r) => r.status === "pendente").reduce((s, r) => s + r[campo], 0);
  const total = pago + pendente;
  const border = tone === "red" ? "border-l-red-400" : tone === "green" ? "border-l-ps-green" : "border-l-blue-400";
  return (
    <div className={`rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 ${border} bg-white p-5`}>
      <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-1">{titulo}</p>
      <p className="text-2xl font-bold text-ps-ink tabular-nums">{formatBRL(total)}</p>
      <p className="text-xs text-ps-muted mt-1.5">
        <span className="text-ps-ink font-medium">{formatBRL(pago)}</span> {rotuloPago} ·{" "}
        <span className="text-amber-700 font-medium">{formatBRL(pendente)}</span> pendente
      </p>
    </div>
  );
}

function Secao({
  titulo,
  rows,
  campo,
  valorLabel,
  rotuloPago,
  vazio,
}: {
  titulo: string;
  rows: any[];
  campo: "repasse" | "receita";
  valorLabel: string;
  rotuloPago: string;
  vazio: string;
}) {
  const total = rows.reduce((s, r) => s + r[campo], 0);
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
                <th className="text-left px-4 py-2.5">Data</th>
                <th className="text-left px-4 py-2.5">Cliente</th>
                <th className="text-left px-4 py-2.5">Competência</th>
                <th className="text-right px-4 py-2.5">{valorLabel}</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-ps-navy/5">
                  <td className="px-4 py-2.5">
                    <Link href={`/faturamento/${r.id}`} className="text-ps-navy underline decoration-dotted hover:decoration-solid">
                      {dataBR(r.data)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{r.billing_clients?.razao ?? "—"}</td>
                  <td className="px-4 py-2.5">{r.competencia}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatBRL(r[campo])}</td>
                  <td className="px-4 py-2.5">
                    {r.status === "pago" ? (
                      <span className="inline-block text-xs bg-green-50 text-green-700 rounded px-2 py-0.5">{rotuloPago}</span>
                    ) : (
                      <span className="inline-block text-xs bg-amber-50 text-amber-700 rounded px-2 py-0.5">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ps-navy bg-ps-bg-2/60 font-bold text-ps-ink">
                <td colSpan={3} className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatBRL(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

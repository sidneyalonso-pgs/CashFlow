import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { montaBaseTarifas, modeloLabel } from "./dados";
import { ExportTarifasExcelButton } from "./ExportTarifasExcelButton";

const dataBR = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function BaseTarifasPage({ searchParams }: { searchParams: { q?: string; freq?: string; status?: string } }) {
  const supabase = createClient();
  const status = searchParams.status ?? "ativo";

  // select("*"): a página funciona mesmo antes da migration 0035 (introducer/frequência/atualizado em aparecem vazios)
  const [{ data: clients }, { data: invoices }] = await Promise.all([
    supabase.from("billing_clients").select("*, billing_subcontas(*)").order("razao"),
    supabase.from("billing_invoices").select("client_id, inicio, fim").neq("status", "cancelado").order("created_at", { ascending: false }),
  ]);

  const ultimoPeriodo: Record<string, { inicio: string | null; fim: string | null }> = {};
  for (const i of invoices ?? []) {
    if (!ultimoPeriodo[i.client_id]) ultimoPeriodo[i.client_id] = { inicio: i.inicio, fim: i.fim };
  }

  let linhas = montaBaseTarifas(clients ?? [], ultimoPeriodo);
  if (status !== "todos") linhas = linhas.filter((l) => l.status === status);
  if (searchParams.freq) linhas = linhas.filter((l) => l.frequencia === searchParams.freq);
  const q = norm(searchParams.q ?? "").trim();
  if (q) {
    linhas = linhas.filter((l) =>
      norm([l.introducer, l.introducerCnpj, l.empresa, l.empresaCnpj, l.numConta].join(" ")).includes(q)
    );
  }

  const introducers = new Set(linhas.map((l) => l.introducer)).size;
  const th = "px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";
  const td = "px-3 py-2 align-top";

  return (
    <div>
      <PageHeader
        title="Base de tarifas"
        subtitle="Tarifas e repasses por empresa e introducer — vem do cadastro de merchants, a mesma base que a fatura usa"
        actions={
          <div className="flex gap-2">
            <ExportTarifasExcelButton linhas={linhas} />
            <Link href="/faturamento/clientes" className="bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors">
              Editar cadastro
            </Link>
          </div>
        }
      />

      <form className="flex flex-wrap items-center gap-3 mb-4">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Buscar introducer, empresa, CNPJ ou conta" className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white w-80" />
        <select name="freq" defaultValue={searchParams.freq ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Mensal e semanal</option>
          <option value="mensal">Mensal</option>
          <option value="semanal">Semanal</option>
        </select>
        <select name="status" defaultValue={status} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="todos">Todos</option>
        </select>
        <button type="submit" className="text-sm text-ps-navy underline">Filtrar</button>
        <span className="text-xs text-ps-muted ml-auto">{linhas.length} empresa(s) · {introducers} introducer(s)</span>
      </form>

      <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-ps-bg-2 sticky top-0 z-10">
            <tr>
              <th className={th}>Introducer</th>
              <th className={th}>CNPJ Introducer</th>
              <th className={th}>Empresa</th>
              <th className={th}>CNPJ Empresa</th>
              <th className={th}>Tarifa IN</th>
              <th className={th}>Repasse IN</th>
              <th className={th}>Tarifa OUT</th>
              <th className={th}>Repasse OUT</th>
              <th className={th}>Tipo de faturamento</th>
              <th className={th}>Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-ps-muted">Nenhuma empresa encontrada.</td></tr>
            )}
            {linhas.map((l, i) => {
              const primeira = i === 0 || linhas[i - 1].introducer !== l.introducer;
              return (
                <tr key={`${l.clienteId}-${l.numConta}-${i}`} className={`border-t ${primeira ? "border-ps-navy/15" : "border-ps-navy/5"}`}>
                  <td className={`${td} font-medium ${primeira ? "text-ps-ink" : "text-ps-muted/60"}`}>
                    {l.introducer}
                    <div className="text-[10px] text-ps-muted font-normal">{modeloLabel(l.modelo)}</div>
                  </td>
                  <td className={`${td} text-ps-muted whitespace-nowrap`}>{l.introducerCnpj || "—"}</td>
                  <td className={td}>
                    <div className="text-ps-ink">{l.empresa}</div>
                    {l.numConta && <div className="text-[10px] text-ps-muted">Conta {l.numConta}</div>}
                    {l.outras && <div className="text-[10px] text-ps-muted mt-0.5 max-w-xs">{l.outras}</div>}
                  </td>
                  <td className={`${td} text-ps-muted whitespace-nowrap`}>{l.empresaCnpj || "—"}</td>
                  <td className={`${td} tabular-nums`}>{l.tarIn}</td>
                  <td className={`${td} tabular-nums`}>
                    {l.repIn}
                    {l.pctRepasse != null && <div className="text-[10px] text-ps-muted">{l.pctRepasse.toLocaleString("pt-BR")}% da tarifa</div>}
                  </td>
                  <td className={`${td} tabular-nums`}>{l.tarOut}</td>
                  <td className={`${td} tabular-nums`}>{l.repOut}</td>
                  <td className={`${td} capitalize ${l.frequenciaInferida ? "text-ps-muted italic" : ""}`}>
                    {l.frequencia || "—"}
                    {l.frequenciaInferida && <div className="text-[10px] not-italic normal-case">inferido pela última fatura</div>}
                  </td>
                  <td className={`${td} text-ps-muted whitespace-nowrap`}>{dataBR(l.atualizadoEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Cada linha vem do cadastro em Merchants. Para mudar uma tarifa, repasse, introducer ou o tipo de faturamento, use <strong>Editar cadastro</strong>:
        a fatura e esta base passam a usar o novo valor. O percentual "da tarifa" mostra quanto do fee vai ao introducer, para conferir divergências.
      </p>
    </div>
  );
}

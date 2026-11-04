import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { montaBaseTarifas } from "./dados";
import { ExportTarifasExcelButton } from "./ExportTarifasExcelButton";
import { TabelaTarifas } from "./TabelaTarifas";

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

  const introducers = new Set(linhas.map((l) => `${l.introducer}|${l.introducerCnpj}`)).size;

  return (
    <div>
      <PageHeader
        title="Base de tarifas"
        subtitle="Tarifas e repasses por introducer e empresa — vem do cadastro de merchants, a mesma base que a fatura usa"
        actions={
          <div className="flex gap-2">
            <ExportTarifasExcelButton linhas={linhas} />
            <Link href="/faturamento/clientes" className="bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors">
              Cadastro de merchants
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

      <TabelaTarifas linhas={linhas} />

      <p className="text-xs text-ps-muted mt-4">
        Clique no introducer para ver as empresas. <strong>Editar</strong> altera a tarifa e o repasse direto no cadastro: a próxima fatura já usa o novo valor
        (faturas já emitidas não mudam). Combo de contas e fee + % guardam a tarifa no cliente, então a mudança vale para todas as empresas dele.
        Mensalidade por faixa se edita em Merchants.
      </p>
    </div>
  );
}

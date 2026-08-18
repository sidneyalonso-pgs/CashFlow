import { createClient } from "@/lib/supabase/server";
import { FinancialCard } from "@/components/FinancialCard";
import { formatBRL, sumMoney } from "@/lib/calculations/money";
import { getWeekBuckets } from "@/lib/calculations/cashflowPeriods";
import { buildExecutiveCash, type CompanyCash } from "@/lib/calculations/executiveCash";
import { scopeAccounts, transferDirection } from "@/lib/calculations/transfers";
import { WeeklyFlowChart, CashByCompanyChart } from "./DashboardCharts";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function dia(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function dataHora(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
/** Compacto para a camada executiva; a tabela abaixo mostra o valor cheio. */
function compacto(v: number) {
  const abs = Math.abs(v);
  const sinal = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sinal}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (abs >= 10_000) return `${sinal}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatBRL(v);
}
function comSinal(v: number) {
  return `${v > 0 ? "+" : ""}${formatBRL(v)}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { company_id?: string; mes?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;

  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const [ano, mes] = (searchParams.mes ?? `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`)
    .split("-")
    .map(Number);

  const from = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const to = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  const periodoEncerrado = to < hoje;

  // Uma consulta por tabela, sem recorte de data: o saldo de abertura e o caixa de hoje dependem
  // de tudo que já foi lançado. O agrupamento por empresa é feito em memória, para não multiplicar
  // consultas por empresa.
  let contasQ = supabase.from("bank_accounts").select("id, company_id, nickname, initial_balance, counts_as_available_cash, blocked_balance");
  let saidasQ = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, deleted_at)")
    .is("payments.deleted_at", null);
  let aPagarQ = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")');
  let entradasQ = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id, deleted_at)")
    .is("revenues.deleted_at", null);
  let aReceberQ = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")');
  let investQ = supabase
    .from("investments")
    .select("company_id, tipo, applied_amount, applied_date, is_opening_balance");
  let transfQ = supabase
    .from("transfers")
    .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id");

  if (companyId) {
    contasQ = contasQ.eq("company_id", companyId);
    saidasQ = saidasQ.eq("payments.company_id", companyId);
    aPagarQ = aPagarQ.eq("company_id", companyId);
    entradasQ = entradasQ.eq("revenues.company_id", companyId);
    aReceberQ = aReceberQ.eq("company_id", companyId);
    investQ = investQ.eq("company_id", companyId);
    transfQ = transfQ.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);
  }

  const [
    { data: contas },
    { data: saidasRaw },
    { data: aPagarRaw },
    { data: entradasRaw },
    { data: aReceberRaw },
    { data: investRaw },
    { data: transfRaw },
    { data: empresasRaw },
  ] = await Promise.all([contasQ, saidasQ, aPagarQ, entradasQ, aReceberQ, investQ, transfQ, supabase.from("companies").select("id, legal_name, trade_name").order("legal_name")]);

  const empresas = (empresasRaw ?? []).filter((c: any) => !companyId || c.id === companyId);

  const dados = buildExecutiveCash(
    {
      accounts: (contas ?? []) as any[],
      inflows: (entradasRaw ?? []).map((r: any) => ({ amount: r.amount, date: r.received_at, companyId: r.revenues.company_id })),
      outflows: (saidasRaw ?? []).map((p: any) => ({ amount: p.amount, date: p.paid_at, companyId: p.payments.company_id })),
      aReceber: (aReceberRaw ?? []).map((r: any) => ({ amount: r.expected_amount, date: r.expected_date, companyId: r.company_id })),
      aPagar: (aPagarRaw ?? []).map((p: any) => ({ amount: p.gross_amount, date: p.due_date, companyId: p.company_id })),
      investments: (investRaw ?? []).map((i: any) => ({ ...i, companyId: i.company_id })),
      transfers: (transfRaw ?? []) as any[],
      from,
      to,
      today: hoje,
    },
    empresas.map((c: any) => ({ id: c.id, label: c.trade_name || c.legal_name }))
  );

  const { consolidado: g, porEmpresa, intercompanyEliminado, diferencaReconciliacao } = dados;

  // ── evolução semanal do consolidado ──────────────────────────────────────
  const semanas = getWeekBuckets(ano, mes);
  const contasCaixa = (contas ?? []).filter((a: any) => a.counts_as_available_cash);
  const escopo = scopeAccounts(undefined, contasCaixa);
  const { isInflow, isOutflow } = transferDirection(escopo, new Set(empresas.map((c: any) => c.id)));
  const movIn = [
    ...(entradasRaw ?? []).map((r: any) => ({ amount: Number(r.amount), date: r.received_at })),
    ...(investRaw ?? []).filter((i: any) => i.tipo === "resgate").map((i: any) => ({ amount: Number(i.applied_amount), date: i.applied_date })),
    ...((transfRaw ?? []) as any[]).filter(isInflow).map((t: any) => ({ amount: Number(t.amount), date: t.transfer_date })),
  ];
  const movOut = [
    ...(saidasRaw ?? []).map((p: any) => ({ amount: Number(p.amount), date: p.paid_at })),
    ...(investRaw ?? []).filter((i: any) => i.tipo === "aplicacao" && !i.is_opening_balance).map((i: any) => ({ amount: Number(i.applied_amount), date: i.applied_date })),
    ...((transfRaw ?? []) as any[]).filter(isOutflow).map((t: any) => ({ amount: Number(t.amount), date: t.transfer_date })),
  ];
  const noIntervalo = (rows: Array<{ amount: number; date: string }>, a: string, b: string) =>
    sumMoney(rows.filter((r) => r.date >= a && r.date <= b).map((r) => r.amount));

  let acumulado = g.caixaInicial;
  const serieSemanal = semanas.map((s) => {
    const fluxo = noIntervalo(movIn, s.start, s.end).minus(noIntervalo(movOut, s.start, s.end));
    acumulado = acumulado.plus(fluxo);
    return { label: s.label.replace("Semana ", "S"), fluxo: fluxo.toNumber(), saldo: acumulado.toNumber() };
  });

  // ── caixa por empresa (só faz sentido com mais de uma) ───────────────────
  const totalPositivo = porEmpresa.reduce((acc, e) => acc + Math.max(e.caixaFinal.toNumber(), 0), 0);
  const serieEmpresas = [...porEmpresa]
    .sort((a, b) => b.caixaFinal.toNumber() - a.caixaFinal.toNumber())
    .map((e) => ({
      name: e.label,
      caixa: e.caixaFinal.toNumber(),
      participacao: totalPositivo > 0 && e.caixaFinal.greaterThan(0) ? (e.caixaFinal.toNumber() / totalPositivo) * 100 : null,
    }));

  // ── destaques ───────────────────────────────────────────────────────────
  const porFluxo = [...porEmpresa].sort((a, b) => b.fluxoLiquido.toNumber() - a.fluxoLiquido.toNumber());
  const maiorGeracao = porFluxo[0];
  const maiorConsumo = porFluxo[porFluxo.length - 1];
  const temConsumo = porFluxo.length > 1 && maiorConsumo && maiorConsumo.fluxoLiquido.isNegative();
  const projetado = g.caixaFinal.plus(g.aReceber).minus(g.aPagar);

  // ── alertas: só fato ────────────────────────────────────────────────────
  const alertas: string[] = [];
  for (const e of porEmpresa) {
    if (e.caixaFinal.isNegative()) alertas.push(`${e.label} fecha o período com caixa negativo de ${formatBRL(e.caixaFinal)}.`);
  }
  const concentrada = serieEmpresas.find((e) => e.participacao != null && e.participacao >= 50);
  if (concentrada && porEmpresa.length > 1) {
    alertas.push(`${concentrada.participacao!.toFixed(0)}% do caixa do grupo está em ${concentrada.name} — concentração relevante.`);
  }
  if (g.aPagar.greaterThan(g.aReceber.plus(g.caixaFinal))) {
    alertas.push(`As obrigações do período (${formatBRL(g.aPagar)}) superam o caixa somado ao que há a receber.`);
  }
  if (projetado.isNegative()) alertas.push(`O caixa projetado para ${dia(to)} fica negativo em ${formatBRL(projetado)}.`);
  if (g.bloqueado.greaterThan(0)) alertas.push(`Há ${formatBRL(g.bloqueado)} de saldo bloqueado, indisponível para uso.`);
  const desatualizadas = porEmpresa.filter((e) => e.ultimoLancamento && e.ultimoLancamento < from);
  if (desatualizadas.length) {
    alertas.push(
      `${desatualizadas.map((e) => e.label).join(", ")} ${desatualizadas.length > 1 ? "estão" : "está"} sem lançamento no período — o saldo mostrado é o fechamento anterior, não a posição atual.`
    );
  }
  if (!diferencaReconciliacao.isZero()) {
    alertas.push(`A soma das empresas difere do consolidado em ${formatBRL(diferencaReconciliacao)} — há movimento fora do escopo das contas cadastradas.`);
  }

  const opcoesMes = MESES.map((label, i) => ({ value: `${ano}-${String(i + 1).padStart(2, "0")}`, label }));

  return (
    <div className="space-y-6 print:space-y-4">
      {/* cabeçalho */}
      <div className="flex items-end justify-between gap-6 flex-wrap border-b-2 border-ps-navy pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ps-navy">Pagsmile · Tesouraria</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ps-ink">Posição Executiva de Caixa</h1>
          <p className="mt-0.5 text-sm text-ps-muted">Posição consolidada, movimentação e projeção de liquidez do grupo</p>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-wider text-ps-muted-2 leading-relaxed">
          <p className="text-ps-muted font-sans text-sm font-semibold tracking-normal normal-case">
            {MESES[mes - 1]} de {ano}
          </p>
          <p>Período {dia(from)} a {dia(to)}</p>
          <p>Atualizado em {dataHora(agora)}</p>
          <p>{empresas.length} empresa{empresas.length > 1 ? "s" : ""} · {contasCaixa.length} conta{contasCaixa.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-3 print:hidden">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Consolidado — todas as empresas</option>
          {(empresasRaw ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
        <select name="mes" defaultValue={`${ano}-${String(mes).padStart(2, "0")}`} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {opcoesMes.map((m) => (
            <option key={m.value} value={m.value}>{m.label}/{ano}</option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <FinancialCard label={`Caixa inicial (${dia(from)})`} value={compacto(g.caixaInicial.toNumber())} />
        <FinancialCard label={`Entradas (${dia(from)} a ${dia(to)})`} value={compacto(g.entradas.toNumber())} tone="positive" />
        <FinancialCard label={`Saídas (${dia(from)} a ${dia(to)})`} value={compacto(g.saidas.toNumber())} tone="negative" />
        <FinancialCard
          label="Fluxo líquido do período"
          value={`${g.fluxoLiquido.greaterThan(0) ? "+" : ""}${compacto(g.fluxoLiquido.toNumber())}`}
          tone={g.fluxoLiquido.isNegative() ? "negative" : "positive"}
          hint={g.fluxoLiquido.isNegative() ? "consumo de caixa" : "geração de caixa"}
        />
        <FinancialCard
          label={periodoEncerrado ? `Caixa final (${dia(to)})` : `Caixa atual (hoje, ${dia(hoje)})`}
          value={compacto(periodoEncerrado ? g.caixaFinal.toNumber() : g.caixaHoje.toNumber())}
          tone={(periodoEncerrado ? g.caixaFinal : g.caixaHoje).isNegative() ? "negative" : "neutral"}
          hint={periodoEncerrado ? "saldo bancário no fim do período" : "saldo bancário realizado"}
        />
      </div>

      {/* faixa de contexto */}
      <div className="bg-ps-navy text-white rounded-ps px-5 py-3.5 text-sm leading-relaxed">
        Até {dia(hoje)}, o grupo tem <strong className="font-semibold">{formatBRL(g.caixaHoje)}</strong> de caixa realizado.
        Para o restante do período há <strong className="font-semibold text-ps-green-300">{formatBRL(g.aReceber)}</strong> a receber
        e <strong className="font-semibold text-ps-green-300">{formatBRL(g.aPagar)}</strong> a pagar — saldo projetado
        para {dia(to)}: <strong className="font-semibold">{formatBRL(projetado)}</strong>.
        {g.investido.greaterThan(0) && (
          <> Fora do caixa, há <strong className="font-semibold">{formatBRL(g.investido)}</strong> aplicados, o que dá uma
          liquidez total de <strong className="font-semibold">{formatBRL(g.caixaHoje.plus(g.investido))}</strong>.</>
        )}
      </div>

      {/* posição por empresa */}
      <div>
        <h2 className="font-semibold text-ps-ink mb-2">Posição por empresa</h2>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ps-bg-2 text-ps-muted text-[10px] uppercase tracking-wider font-mono">
              <tr>
                <th className="text-left px-4 py-2.5">Empresa</th>
                <th className="text-right px-4 py-2.5">Caixa inicial</th>
                <th className="text-right px-4 py-2.5">Entradas</th>
                <th className="text-right px-4 py-2.5">Saídas</th>
                <th className="text-right px-4 py-2.5">Fluxo líquido</th>
                <th className="text-right px-4 py-2.5">Caixa em {dia(to)}</th>
                <th className="text-right px-4 py-2.5">Variação</th>
                <th className="text-right px-4 py-2.5">Investido</th>
                <th className="text-left px-4 py-2.5">Último lanç.</th>
              </tr>
            </thead>
            <tbody>
              {[...porEmpresa].sort((a, b) => b.caixaFinal.toNumber() - a.caixaFinal.toNumber()).map((e) => (
                <EmpresaRow key={e.companyId} e={e} from={from} />
              ))}
            </tbody>
            {porEmpresa.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-ps-navy bg-ps-bg-2/60 font-bold text-ps-ink">
                  <td className="px-4 py-3">CONSOLIDADO</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.caixaInicial)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.entradas)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.saidas)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${g.fluxoLiquido.isNegative() ? "text-red-600" : "text-ps-green-700"}`}>
                    {comSinal(g.fluxoLiquido.toNumber())}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${g.caixaFinal.isNegative() ? "text-red-600" : ""}`}>{formatBRL(g.caixaFinal)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${g.variacao.isNegative() ? "text-red-600" : "text-ps-green-700"}`}>
                    {g.variacaoPerc != null ? `${g.variacaoPerc > 0 ? "+" : ""}${g.variacaoPerc.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ps-navy/70">{formatBRL(g.investido)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-[11px] text-ps-muted mt-2">
          Caixa é saldo bancário; a coluna Investido é o principal aplicado e não está somado ao caixa.
          {intercompanyEliminado.greaterThan(0) && (
            <> No consolidado foram eliminados {formatBRL(intercompanyEliminado)} de transferências entre contas do próprio grupo, para não contar o mesmo dinheiro duas vezes.</>
          )}
        </p>
      </div>

      {/* gráficos */}
      <div className={`grid grid-cols-1 gap-4 ${porEmpresa.length > 1 ? "lg:grid-cols-2" : ""}`}>
        <WeeklyFlowChart data={serieSemanal} />
        {porEmpresa.length > 1 && <CashByCompanyChart data={serieEmpresas} />}
      </div>

      {/* destaques */}
      <div>
        <h2 className="font-semibold text-ps-ink mb-2">Destaques do período</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {maiorGeracao && maiorGeracao.fluxoLiquido.greaterThan(0) && (
            <Destaque titulo="Maior geração de caixa" nome={maiorGeracao.label} valor={comSinal(maiorGeracao.fluxoLiquido.toNumber())} tone="positive" />
          )}
          {temConsumo && (
            <Destaque titulo="Maior consumo de caixa" nome={maiorConsumo.label} valor={formatBRL(maiorConsumo.fluxoLiquido)} tone="negative" />
          )}
          <Destaque titulo={`A receber até ${dia(to)}`} nome="Provisionado" valor={formatBRL(g.aReceber)} tone="amber" />
          <Destaque titulo={`A pagar até ${dia(to)}`} nome="Provisionado" valor={formatBRL(g.aPagar)} tone="amber" />
          <Destaque titulo={`Saldo projetado ${dia(to)}`} nome="Caixa + a receber − a pagar" valor={formatBRL(projetado)} tone={projetado.isNegative() ? "negative" : "neutral"} />
        </div>
      </div>

      {/* alertas */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-amber-500 p-5">
          <h2 className="font-semibold text-ps-ink mb-2">Pontos de atenção</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-ps-ink-2">
            {alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmpresaRow({ e, from }: { e: CompanyCash; from: string }) {
  const desatualizada = !!e.ultimoLancamento && e.ultimoLancamento < from;
  const fundo = e.caixaFinal.isNegative() ? "bg-red-50/70" : desatualizada ? "bg-amber-50/60" : "";
  return (
    <tr className={`border-t border-ps-navy/5 ${fundo}`}>
      <td className="px-4 py-3 font-semibold text-ps-ink">{e.label}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatBRL(e.caixaInicial)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ps-green-700">{formatBRL(e.entradas)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatBRL(e.saidas)}</td>
      <td className={`px-4 py-3 text-right tabular-nums font-medium ${e.fluxoLiquido.isNegative() ? "text-red-600" : "text-ps-green-700"}`}>
        {comSinal(e.fluxoLiquido.toNumber())}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${e.caixaFinal.isNegative() ? "text-red-600" : ""}`}>{formatBRL(e.caixaFinal)}</td>
      <td className={`px-4 py-3 text-right tabular-nums ${e.variacao.isNegative() ? "text-red-600" : e.variacao.isZero() ? "text-ps-muted-2" : "text-ps-green-700"}`}>
        {e.variacaoPerc != null ? `${e.variacaoPerc > 0 ? "+" : ""}${e.variacaoPerc.toFixed(1)}%` : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-ps-navy/70">
        {e.investido.greaterThan(0) ? formatBRL(e.investido) : <span className="text-ps-muted-2">—</span>}
      </td>
      <td className="px-4 py-3 font-mono text-[11px]">
        {e.ultimoLancamento ? (
          <span className={desatualizada ? "text-amber-700" : "text-ps-muted"}>{dia(e.ultimoLancamento)}</span>
        ) : (
          <span className="text-ps-muted-2">—</span>
        )}
      </td>
    </tr>
  );
}

function Destaque({ titulo, nome, valor, tone }: { titulo: string; nome: string; valor: string; tone: "positive" | "negative" | "amber" | "neutral" }) {
  const cor =
    tone === "positive" ? "text-ps-green-700" : tone === "negative" ? "text-red-600" : tone === "amber" ? "text-amber-700" : "text-ps-ink";
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-4">
      <p className="text-[10px] uppercase tracking-wider text-ps-muted font-mono">{titulo}</p>
      <p className="mt-1.5 text-sm font-semibold text-ps-ink truncate">{nome}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}

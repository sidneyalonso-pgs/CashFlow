import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/calculations/money";
import { buildCapacity, type CompanyCapacity } from "@/lib/calculations/executiveCash";
import { DecisionSimulator } from "./DecisionSimulator";

/** Compacto na camada executiva; a tabela mostra o valor cheio. */
function compacto(v: number) {
  const abs = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${s}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (abs >= 1_000) return `${s}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return formatBRL(v);
}
function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function shift(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const HORIZONTES = [
  { dias: 30, label: "próximos 30 dias" },
  { dias: 60, label: "próximos 60 dias" },
  { dias: 90, label: "próximos 90 dias" },
];

export default async function PosicaoExecutivaPage({
  searchParams,
}: {
  searchParams: { company_id?: string; dias?: string };
}) {
  const supabase = createClient();
  const companyId = searchParams.company_id;
  const dias = HORIZONTES.some((h) => String(h.dias) === searchParams.dias) ? Number(searchParams.dias) : 30;
  const horizonte = HORIZONTES.find((h) => h.dias === dias)!;

  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const horizonEnd = shift(hoje, dias);

  let contasQ = supabase.from("bank_accounts").select("id, company_id, initial_balance, counts_as_available_cash");
  let saidasQ = supabase
    .from("payment_realizations")
    .select("amount, paid_at, payments!inner(company_id, deleted_at)")
    .is("payments.deleted_at", null);
  let entradasQ = supabase
    .from("revenue_realizations")
    .select("amount, received_at, revenues!inner(company_id, deleted_at)")
    .is("revenues.deleted_at", null);
  let compromissosQ = supabase
    .from("payments")
    .select("gross_amount, due_date, company_id")
    .is("deleted_at", null)
    .not("status", "in", '("pago","cancelado")')
    .gte("due_date", hoje);
  let recebiveisQ = supabase
    .from("revenues")
    .select("expected_amount, expected_date, company_id")
    .is("deleted_at", null)
    .not("status", "in", '("recebida","cancelada")')
    .gte("expected_date", hoje);
  let investQ = supabase.from("investments").select("company_id, tipo, applied_amount, applied_date, is_opening_balance");
  let transfQ = supabase
    .from("transfers")
    .select("tipo, amount, transfer_date, company_id, to_company_id, from_account_id, to_account_id");

  if (companyId) {
    contasQ = contasQ.eq("company_id", companyId);
    saidasQ = saidasQ.eq("payments.company_id", companyId);
    entradasQ = entradasQ.eq("revenues.company_id", companyId);
    compromissosQ = compromissosQ.eq("company_id", companyId);
    recebiveisQ = recebiveisQ.eq("company_id", companyId);
    investQ = investQ.eq("company_id", companyId);
    transfQ = transfQ.or(`company_id.eq.${companyId},to_company_id.eq.${companyId}`);
  }

  const [
    { data: contas },
    { data: saidasRaw },
    { data: entradasRaw },
    { data: compromissosRaw },
    { data: recebiveisRaw },
    { data: investRaw },
    { data: transfRaw },
    { data: empresasRaw },
    // A coluna de reserva pode ainda não existir (migration 0018 pendente). O erro é tolerado
    // de propósito: sem ela a reserva fica "não definida" e a tela avisa, em vez de quebrar.
    { data: reservasRaw },
  ] = await Promise.all([
    contasQ,
    saidasQ,
    entradasQ,
    compromissosQ,
    recebiveisQ,
    investQ,
    transfQ,
    supabase.from("companies").select("id, legal_name, trade_name").order("legal_name"),
    supabase.from("companies").select("id, operational_reserve"),
  ]);

  const empresas = (empresasRaw ?? []).filter((c: any) => !companyId || c.id === companyId);
  const reserves: Record<string, number | null> = {};
  for (const r of (reservasRaw ?? []) as any[]) {
    reserves[r.id] = r.operational_reserve == null ? null : Number(r.operational_reserve);
  }
  const reservaDefinida = Object.values(reserves).some((r) => r != null);

  const compromissosLista = (compromissosRaw ?? []).map((p: any) => ({
    amount: Number(p.gross_amount) || 0,
    date: p.due_date as string,
    companyId: p.company_id as string,
  }));
  const recebiveisLista = (recebiveisRaw ?? []).map((r: any) => ({
    amount: Number(r.expected_amount) || 0,
    date: r.expected_date as string,
    companyId: r.company_id as string,
  }));

  const { porEmpresa, consolidado: g, intercompanyIdentificavel, diferencaReconciliacao } = buildCapacity(
    {
      accounts: (contas ?? []) as any[],
      inflows: (entradasRaw ?? []).map((r: any) => ({ amount: r.amount, date: r.received_at, companyId: r.revenues?.company_id })),
      outflows: (saidasRaw ?? []).map((p: any) => ({ amount: p.amount, date: p.paid_at, companyId: p.payments?.company_id })),
      investments: (investRaw ?? []).map((i: any) => ({ ...i, companyId: i.company_id })),
      transfers: (transfRaw ?? []) as any[],
      compromissos: compromissosLista,
      recebiveis: recebiveisLista,
      today: hoje,
      horizonEnd,
      reserves,
    },
    empresas.map((c: any) => ({ id: c.id, label: c.trade_name || c.legal_name }))
  );

  const ordenadas = [...porEmpresa].sort((a, b) => b.disponibilidade.toNumber() - a.disponibilidade.toNumber());

  return (
    <div className="space-y-6 print:space-y-4">
      {/* cabeçalho */}
      <div className="flex items-end justify-between gap-6 flex-wrap border-b-2 border-ps-navy pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ps-navy">Pagsmile · Tesouraria</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ps-ink">Posição Executiva de Recursos</h1>
          <p className="mt-0.5 text-sm text-ps-muted">Capacidade financeira atual e suporte à tomada de decisão</p>
        </div>
        <div className="text-right text-[11px] font-mono uppercase tracking-wider text-ps-muted-2 leading-relaxed">
          <p className="font-sans text-sm font-semibold normal-case tracking-normal text-ps-muted">
            {companyId ? empresas[0]?.trade_name || empresas[0]?.legal_name : "Consolidado — todas as empresas"}
          </p>
          <p>Posição em {dataBR(hoje)}</p>
          <p>Compromissos {horizonte.label} (até {dataBR(horizonEnd)})</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-3 print:hidden">
        <select name="company_id" defaultValue={companyId ?? ""} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          <option value="">Consolidado — todas as empresas</option>
          {(empresasRaw ?? []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
          ))}
        </select>
        <select name="dias" defaultValue={String(dias)} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {HORIZONTES.map((h) => (
            <option key={h.dias} value={h.dias}>Compromissos: {h.label}</option>
          ))}
        </select>
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi rotulo="Caixa" valor={compacto(g.caixa.toNumber())} nota="saldo em conta bancária" tone={g.caixa.isNegative() ? "neg" : "ink"} />
        <Kpi rotulo="Investimentos" valor={compacto(g.investido.toNumber())} nota="aplicado, resgatável" tone="ink" />
        <Kpi rotulo="Disponibilidade total" valor={compacto(g.disponibilidade.toNumber())} nota="caixa + investimentos" tone="ink" />
        <Kpi rotulo="Compromissos" valor={compacto(g.compromissos.toNumber())} nota={`${horizonte.label} — até ${dataBR(horizonEnd)}`} tone="amber" />
        <Kpi
          destaque
          rotulo="Capacidade para decisão"
          valor={compacto(g.capacidade.toNumber())}
          nota={g.reserva == null ? "sem reserva definida no cadastro" : "disponível após compromissos e reserva"}
          tone={g.capacidade.isNegative() ? "neg" : "pos"}
        />
      </div>

      {g.reserva == null && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-ps-sm px-4 py-2.5">
          <strong>Reserva operacional não cadastrada.</strong> A capacidade acima é a disponibilidade menos os
          compromissos, sem descontar reserva nenhuma — ou seja, está superestimada. O cálculo já prevê o campo;
          basta definir o valor mínimo de cada empresa para ele passar a ser descontado.
        </p>
      )}

      {/* posição por empresa */}
      <div>
        <h2 className="font-semibold text-ps-ink mb-2">Posição por empresa</h2>
        <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ps-bg-2 text-ps-muted text-[10px] uppercase tracking-wider font-mono">
              <tr>
                <th className="text-left px-4 py-2.5">Empresa</th>
                <th className="text-right px-4 py-2.5">Caixa</th>
                <th className="text-right px-4 py-2.5">Investimentos</th>
                <th className="text-right px-4 py-2.5">Disponibilidade</th>
                <th className="text-right px-4 py-2.5">Compromissos</th>
                <th className="text-right px-4 py-2.5">Reserva</th>
                <th className="text-right px-4 py-2.5">Capacidade</th>
                <th className="text-center px-4 py-2.5">7d</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((e) => (
                <LinhaEmpresa key={e.companyId} e={e} />
              ))}
            </tbody>
            {porEmpresa.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-ps-navy bg-ps-bg-2/60 font-bold text-ps-ink">
                  <td className="px-4 py-3">CONSOLIDADO</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.caixa)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.investido)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBRL(g.disponibilidade)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{formatBRL(g.compromissos)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {g.reserva == null ? <span className="text-ps-muted-2 font-normal">—</span> : formatBRL(g.reserva)}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${g.capacidade.isNegative() ? "text-red-600" : "text-ps-green-700"}`}>
                    {formatBRL(g.capacidade)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-[11px] text-ps-muted mt-2">
          Caixa é saldo em conta e nunca inclui investimento. Capacidade = disponibilidade − compromissos − reserva.
          Recurso em uma empresa não está automaticamente disponível para outra.
          {intercompanyIdentificavel > 0
            ? ` No consolidado, transferência entre contas do próprio grupo se anula (${intercompanyIdentificavel} lançamento identificável).`
            : ""}
          {!diferencaReconciliacao.isZero() && ` Atenção: a soma das empresas difere do consolidado em ${formatBRL(diferencaReconciliacao)}.`}
        </p>
      </div>

      {/* simulador */}
      <DecisionSimulator
        empresas={porEmpresa.map((e) => ({
          id: e.companyId,
          label: e.label,
          caixa: e.caixa.toNumber(),
          investido: e.investido.toNumber(),
          reserva: e.reserva,
        }))}
        compromissos={compromissosLista}
        recebiveis={recebiveisLista}
        hoje={hoje}
        reservaDefinida={reservaDefinida}
      />
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  nota,
  tone,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tone: "ink" | "pos" | "neg" | "amber";
  destaque?: boolean;
}) {
  const cor = tone === "pos" ? "text-ps-green-700" : tone === "neg" ? "text-red-600" : tone === "amber" ? "text-amber-700" : "text-ps-ink";
  const trilho = tone === "pos" ? "bg-ps-green" : tone === "neg" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-ps-navy/20";
  return (
    <div
      className={`relative bg-white rounded-ps shadow-ps-sm border overflow-hidden p-4 pl-5 ${
        destaque ? "border-ps-navy/20 ring-1 ring-ps-navy/10" : "border-ps-navy/5"
      }`}
    >
      <span className={`absolute left-0 top-0 bottom-0 ${destaque ? "w-1.5" : "w-1"} ${trilho}`} />
      <p className="text-[10px] uppercase tracking-wider text-ps-muted font-mono">{rotulo}</p>
      <p className={`mt-1.5 font-bold tabular-nums ${destaque ? "text-2xl" : "text-xl"} ${cor}`}>{valor}</p>
      <p className="mt-1 text-[11px] text-ps-muted leading-snug">{nota}</p>
    </div>
  );
}

function LinhaEmpresa({ e }: { e: CompanyCapacity }) {
  const fundo = e.capacidade.isNegative() ? "bg-red-50/70" : "";
  return (
    <tr className={`border-t border-ps-navy/5 ${fundo}`}>
      <td className="px-4 py-3 font-semibold text-ps-ink">{e.label}</td>
      <td className={`px-4 py-3 text-right tabular-nums ${e.caixa.isNegative() ? "text-red-600" : ""}`}>{formatBRL(e.caixa)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ps-navy/70">
        {e.investido.greaterThan(0) ? formatBRL(e.investido) : <span className="text-ps-muted-2">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatBRL(e.disponibilidade)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-amber-700">
        {e.compromissos.greaterThan(0) ? formatBRL(e.compromissos) : <span className="text-ps-muted-2">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {e.reserva == null ? <span className="text-ps-muted-2">—</span> : formatBRL(e.reserva)}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums font-bold ${e.capacidade.isNegative() ? "text-red-600" : "text-ps-green-700"}`}>
        {formatBRL(e.capacidade)}
      </td>
      <td className="px-4 py-3">
        <Sparkline serie={e.serie7d} />
      </td>
    </tr>
  );
}

/** Tendência do caixa nos últimos 7 dias. Secundária: informa direção, não valor. */
function Sparkline({ serie }: { serie: number[] }) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const faixa = max - min;
  const larg = 56;
  const alt = 18;
  const passo = serie.length > 1 ? larg / (serie.length - 1) : larg;
  const pontos = serie
    .map((v, i) => `${(i * passo).toFixed(1)},${(faixa === 0 ? alt / 2 : alt - 2 - ((v - min) / faixa) * (alt - 4)).toFixed(1)}`)
    .join(" ");

  const delta = serie[serie.length - 1] - serie[0];
  const cor = faixa === 0 ? "#8294A6" : delta < 0 ? "#C2413A" : "#1AA380";
  const seta = faixa === 0 ? "→" : delta < 0 ? "↘" : "↗";

  return (
    <span className="flex items-center justify-center gap-1.5">
      <svg width={larg} height={alt} viewBox={`0 0 ${larg} ${alt}`} aria-hidden="true">
        <polyline
          points={pontos}
          fill="none"
          stroke={cor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={faixa === 0 ? "3 3" : undefined}
        />
      </svg>
      <span className="text-sm font-semibold" style={{ color: cor }}>{seta}</span>
    </span>
  );
}

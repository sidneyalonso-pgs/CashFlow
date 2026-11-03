import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { montaRelatorioReceitas } from "./dados";
import { LinhaTipoReceita } from "./LinhaTipoReceita";
import { ExportReceitasExcelButton } from "./ExportReceitasExcelButton";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function RelatorioReceitasPage({ searchParams }: { searchParams: { mes?: string } }) {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hoje.slice(0, 7);

  // o relatório é só da Pagsmile IP (outras empresas do grupo, como a Select Credit, ficam de fora)
  const { data: company } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .or("trade_name.ilike.%Pagsmile IP%,legal_name.ilike.%Pagsmile IP%")
    .limit(1)
    .maybeSingle();
  if (!company) {
    return (
      <div>
        <PageHeader title="Receitas do mês" subtitle="Fechamento" />
        <p className="text-sm text-red-600">Empresa "Pagsmile IP" não encontrada no cadastro.</p>
      </div>
    );
  }

  const REV_BASE = "id, created_at, status, description, realized_amount, realized_date, expected_amount, expected_date, categories(name)";
  const [revComp, payRes] = await Promise.all([
    supabase
      .from("revenues")
      .select(`${REV_BASE}, competence_date`)
      .eq("company_id", company.id)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000),
    supabase
      .from("payments")
      .select("id, status, gross_amount, description, competence_date, due_date, expected_payment_date, effective_payment_date, suppliers(legal_name)")
      .eq("company_id", company.id)
      .in("status", ["pago", "agendado"])
      .is("deleted_at", null)
      .ilike("description", "Repasse%")
      .limit(10000),
  ]);
  // antes da migration 0032 a coluna de competência não existe: cai para a leitura sem ela
  let revenues: any[] = (revComp.data ?? []) as any[];
  if (revComp.error) {
    const { data: simples } = await supabase
      .from("revenues")
      .select(REV_BASE)
      .eq("company_id", company.id)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000);
    revenues = (simples ?? []) as any[];
  }

  // receita que vem de fatura (Bets, mensalidade, China) entra na competência da FATURA, não no mês do recebimento
  const { data: faturas } = await supabase
    .from("billing_invoices")
    .select("revenue_id, payment_id, competencia, inicio, fim")
    .eq("company_id", company.id)
    .neq("status", "cancelado")
    .limit(10000);
  const competenciaFatura = new Map<string, string>();
  const periodoPorPagamento = new Map<string, string>();
  const competenciaPorPagamento = new Map<string, string>();
  const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  for (const f of (faturas ?? []) as any[]) {
    if (f.revenue_id && /^\d{4}-\d{2}$/.test(f.competencia ?? "")) competenciaFatura.set(f.revenue_id, f.competencia);
    if (f.payment_id && f.inicio && f.fim) periodoPorPagamento.set(f.payment_id, `${dm(f.inicio)} a ${dm(f.fim)}`);
    if (f.payment_id && /^\d{4}-\d{2}$/.test(f.competencia ?? "")) competenciaPorPagamento.set(f.payment_id, f.competencia);
  }

  const rel = montaRelatorioReceitas(mes, revenues, (payRes.data ?? []) as any[], competenciaFatura, periodoPorPagamento, competenciaPorPagamento);

  const th = "text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";
  const td = "px-4 py-2.5 text-right tabular-nums whitespace-nowrap";

  return (
    <div>
      <PageHeader title="Receitas do mês" subtitle={`${company.trade_name || company.legal_name} — fechamento por competência mensal`} />

      <form className="flex flex-wrap items-center gap-3 mb-5">
        <input type="month" name="mes" defaultValue={mes} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <button className="text-sm text-ps-navy underline" type="submit">
          Atualizar
        </button>
        <Link href="/relatorios" className="text-sm text-ps-muted underline ml-auto">
          Voltar aos relatórios
        </Link>
      </form>

      <div className="flex justify-end mb-4">
        <ExportReceitasExcelButton mes={mes} empresa={String(company.trade_name || company.legal_name)} rel={rel} />
      </div>

      <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-ps-bg-2">
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted">Receita por tipo (clique para ver os lançamentos)</th>
              <th className={th}>Realizado</th>
              <th className={th}>Projetado</th>
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rel.tipos.map((t) => (
              <LinhaTipoReceita key={t.label} linha={t} />
            ))}
            <tr className="border-t-2 border-ps-navy/15 bg-ps-bg-2/60 font-bold">
              <td className="px-4 py-3 text-ps-ink">Receita bruta</td>
              <td className={td}>{brl(rel.receitaBruta.real)}</td>
              <td className={td}>{brl(rel.receitaBruta.projetado)}</td>
              <td className={td}>{brl(rel.receitaBruta.total)}</td>
            </tr>

            <tr className="border-t border-ps-navy/10">
              <td colSpan={4} className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wide text-ps-muted">
                (−) Repasses a parceiros — abatem o Fee Pix
              </td>
            </tr>
            {rel.repasses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-ps-muted">
                  Nenhum repasse com competência neste mês.
                </td>
              </tr>
            ) : (
              <>
                <tr>
                  <td colSpan={4} className="px-4 pb-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] font-semibold uppercase tracking-wide text-ps-muted">
                            <th className="text-left py-1 pr-4">Empresa</th>
                            <th className="text-right py-1 pr-4">Valor do repasse</th>
                            <th className="text-left py-1 pr-4">Período</th>
                            <th className="text-left py-1 pr-4">Data do repasse ou recebimento</th>
                            <th className="text-left py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rel.repasses.map((r, i) => (
                            <tr key={i} className="border-t border-ps-navy/5">
                              <td className="py-2 pr-4 font-medium text-ps-ink">{r.empresa}</td>
                              <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{brl(-r.valor)}</td>
                              <td className="py-2 pr-4 tabular-nums whitespace-nowrap">{r.periodo ?? "—"}</td>
                              <td className="py-2 pr-4 tabular-nums whitespace-nowrap">{r.data ? dm(r.data) : "—"}</td>
                              <td className="py-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                    r.status === "Pago" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr className="border-t border-ps-navy/10 font-semibold">
                  <td className="px-4 py-2.5 text-ps-ink">Total de repasses</td>
                  <td className={td}>{brl(-rel.totalRepasses)}</td>
                  <td colSpan={2}></td>
                </tr>
              </>
            )}

            <tr className="border-t border-ps-navy/10">
              <td className="px-4 py-2.5 text-ps-ink">Fee Pix após repasses</td>
              <td className={td} colSpan={3}>
                {brl(rel.feePixLiquido)}
              </td>
            </tr>
            <tr className="border-t-2 border-ps-navy/15 bg-ps-navy-50/60 font-bold">
              <td className="px-4 py-3 text-ps-ink">Receita líquida</td>
              <td className={td} colSpan={3}>
                {brl(rel.receitaLiquida)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Só Pagsmile IP. Cada linha abre os lançamentos que a compõem, em ordem de dia, com a competência usada (que decide o mês), a data de caixa (recebimento ou previsão) e o dia em que foi lançado no sistema. Competência: receitas da
        Central Piloto pelo dia de referência; as demais, pela data de recebimento (realizado) ou de previsão (projetado). Receitas faturadas (Bets, mensalidade, China) entram na competência da fatura, mesmo que o dinheiro seja recebido em outro
        mês (a DRE ainda usa o mês do recebimento para elas). O <strong>Fee China</strong> é separado do Fee Pix pela descrição. Categorias fora da lista aparecem em linhas
        próprias abaixo de Prestação de serviços. Repasses são os pagamentos “Repasse…” pagos ou agendados, pela competência do
        pagamento, e a receita líquida é a receita bruta menos todos eles.
      </p>
    </div>
  );
}

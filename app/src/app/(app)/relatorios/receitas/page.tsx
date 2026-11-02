import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { montaRelatorioReceitas } from "./dados";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const celula = (n: number) => (n === 0 ? "—" : brl(n));

export default async function RelatorioReceitasPage({
  searchParams,
}: {
  searchParams: { mes?: string; company_id?: string };
}) {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hoje.slice(0, 7);

  const fimDoMes = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);

  const { data: companies } = await supabase.from("companies").select("id, legal_name, trade_name").order("legal_name");
  const padrao = (companies ?? []).find((c) => (c.trade_name ?? "").toLowerCase() === "pagsmile ip") ?? companies?.[0];
  const companyId = searchParams.company_id || padrao?.id || "";

  // mês inteiro mais folga: a competência da Central (referência) pode cair em outro mês que o caixa
  const [revComp, payRes] = await Promise.all([
    supabase
      .from("revenues")
      .select("status, description, realized_amount, realized_date, expected_amount, expected_date, competence_date, categories(name)")
      .eq("company_id", companyId)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000),
    supabase
      .from("payments")
      .select("status, gross_amount, description, competence_date, suppliers(legal_name)")
      .eq("company_id", companyId)
      .in("status", ["pago", "agendado"])
      .is("deleted_at", null)
      .gte("competence_date", `${mes}-01`)
      .lte("competence_date", fimDoMes)
      .limit(10000),
  ]);
  // antes da migration 0032 a coluna de competência não existe: cai para a leitura sem ela
  let revenues: any[] = (revComp.data ?? []) as any[];
  if (revComp.error) {
    const { data: simples } = await supabase
      .from("revenues")
      .select("status, description, realized_amount, realized_date, expected_amount, expected_date, categories(name)")
      .eq("company_id", companyId)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000);
    revenues = (simples ?? []) as any[];
  }

  const rel = montaRelatorioReceitas(mes, revenues, (payRes.data ?? []) as any[]);
  const tipos = rel.tipos.filter((t) => t.total !== 0 || t.key !== "outras");

  const th = "text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";
  const td = "px-4 py-2.5 text-right tabular-nums whitespace-nowrap";

  return (
    <div>
      <PageHeader title="Receitas do mês" subtitle="Receita por tipo, repasses e receita líquida — competência mensal" />

      <form className="flex flex-wrap items-center gap-3 mb-5">
        <select name="company_id" defaultValue={companyId} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        <input type="month" name="mes" defaultValue={mes} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <button className="text-sm text-ps-navy underline" type="submit">
          Atualizar
        </button>
        <Link href="/relatorios" className="text-sm text-ps-muted underline ml-auto">
          Voltar aos relatórios
        </Link>
      </form>

      <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-ps-bg-2">
            <tr>
              <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ps-muted">Receita por tipo</th>
              <th className={th}>Realizado</th>
              <th className={th}>Projetado</th>
              <th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.key} className="border-t border-ps-navy/5">
                <td className="px-4 py-2.5 font-medium text-ps-ink">{t.label}</td>
                <td className={td}>{celula(t.real)}</td>
                <td className={`${td} text-ps-muted`}>{celula(t.projetado)}</td>
                <td className={`${td} font-semibold`}>{celula(t.total)}</td>
              </tr>
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
                <tr className="text-[10px] font-semibold uppercase tracking-wide text-ps-muted">
                  <td className="px-4 py-1">Empresa</td>
                  <td className={`${th} py-1`}>Valor do repasse</td>
                  <td className={`${th} py-1`} colSpan={2}>
                    Status
                  </td>
                </tr>
                {rel.repasses.map((r) => (
                  <tr key={r.empresa} className="border-t border-ps-navy/5">
                    <td className="px-4 py-2.5 font-medium text-ps-ink">{r.empresa}</td>
                    <td className={td}>{brl(-r.total)}</td>
                    <td className={`${td} text-right`} colSpan={2}>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          r.status === "Pago" ? "bg-green-100 text-green-700" : r.status === "Agendado" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {r.status}
                        {r.status === "Parcial" ? ` · pago ${brl(r.pago)}` : ""}
                      </span>
                    </td>
                  </tr>
                ))}
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
        Competência do mês: receitas da Central Piloto pelo dia de referência; as demais, pela data de recebimento (realizado) ou de
        previsão (projetado). O <strong>Fee China</strong> é separado do Fee Pix pela descrição do lançamento. “Outras receitas” só
        aparece quando há valor em categoria fora da lista. Repasses são os pagamentos “Repasse…” pagos ou agendados, pela competência do
        pagamento, e a receita líquida é a receita bruta menos todos eles.
      </p>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FpaTabs } from "../FpaTabs";
import { DreTable } from "../DreTable";
import { colunasMensais, colunasSemanais, montaDre } from "../dreData";

export default async function DreGerencialPage({
  searchParams,
}: {
  searchParams: { visao?: string; ano?: string; mes?: string; company_id?: string };
}) {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const semanal = searchParams.visao === "semanal";
  const ano = Number(searchParams.ano) || Number(hoje.slice(0, 4));
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hoje.slice(0, 7);

  const { data: companies } = await supabase.from("companies").select("id, legal_name, trade_name").order("legal_name");
  const padrao = (companies ?? []).find((c) => (c.trade_name ?? "").toLowerCase() === "pagsmile ip") ?? companies?.[0];
  const companyId = searchParams.company_id || padrao?.id || "";

  const cols = semanal ? colunasSemanais(mes) : colunasMensais(ano);
  const from = cols[0].from;
  const to = cols[cols.length - 1].to;

  const [{ data: payments }, { data: revenues }, ajustes, auth] = await Promise.all([
    supabase
      .from("payments")
      .select("status, gross_amount, competence_date, categories(name, fpa_classification)")
      .eq("company_id", companyId)
      .in("status", ["pago", "agendado"])
      .is("deleted_at", null)
      .gte("competence_date", from)
      .lte("competence_date", to)
      .limit(10000),
    supabase
      .from("revenues")
      .select("status, realized_amount, realized_date, expected_amount, expected_date, categories(name, fpa_classification)")
      .eq("company_id", companyId)
      .in("status", ["recebida", "estimada"])
      .is("deleted_at", null)
      .limit(10000),
    supabase.from("dre_ajustes_manuais").select("periodo, valor").eq("company_id", companyId).eq("linha", "pdd"),
    supabase.auth.getUser(),
  ]);
  const user = auth.data.user;
  const { data: prof } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  const editaPdd = !semanal && ["administrador", "tesouraria"].includes(prof?.role ?? "");

  const revs = (revenues ?? []).filter((r: any) => {
    const d = r.status === "recebida" ? r.realized_date : r.expected_date;
    return d && d >= from && d <= to;
  });
  const pdd: Record<string, number> = {};
  for (const a of (ajustes.data ?? []) as any[]) pdd[String(a.periodo).slice(0, 7)] = Number(a.valor);

  const rows = montaDre(cols, payments ?? [], revs, pdd);

  const link = (p: Record<string, string>) => {
    const q = new URLSearchParams({ visao: semanal ? "semanal" : "mensal", ano: String(ano), mes, company_id: companyId, ...p });
    return `/fpa/dre?${q.toString()}`;
  };
  const pill = (on: boolean) =>
    `px-3 py-1.5 text-sm rounded-ps-sm border ${on ? "bg-ps-navy text-white border-ps-navy" : "border-ps-navy/15 text-ps-ink hover:bg-ps-navy/[0.04]"}`;

  return (
    <div>
      <PageHeader title="FP&A" subtitle="DRE gerencial — realizado × projetado, por categoria" />
      <FpaTabs ativa="dre" />

      <form className="flex flex-wrap items-center gap-3 mb-5">
        <input type="hidden" name="visao" value={semanal ? "semanal" : "mensal"} />
        <select name="company_id" defaultValue={companyId} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white">
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
        {semanal ? (
          <input type="month" name="mes" defaultValue={mes} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        ) : (
          <input type="number" name="ano" defaultValue={ano} min={2024} max={2035} className="w-24 rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        )}
        <button className="text-sm text-ps-navy underline" type="submit">
          Atualizar
        </button>
        <div className="flex gap-2 ml-auto">
          <Link href={link({ visao: "mensal" })} className={pill(!semanal)}>
            Mensal
          </Link>
          <Link href={link({ visao: "semanal" })} className={pill(semanal)}>
            Semanal
          </Link>
        </div>
      </form>

      <p className="text-xs text-ps-muted mb-3">
        Real = pagamentos pagos e receitas recebidas. Projetado = pagamentos agendados e receitas estimadas. Competência pela data do lançamento.
        Despesas aparecem negativas. {semanal ? "Semanas de segunda a domingo, cortadas nos limites do mês." : "A PDD é lançada à mão, em cada mês."}
      </p>

      <DreTable cols={cols} rows={rows} companyId={companyId} editaPdd={editaPdd} />
    </div>
  );
}

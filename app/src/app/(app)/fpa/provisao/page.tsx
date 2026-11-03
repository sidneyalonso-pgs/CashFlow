import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { FpaTabs } from "../FpaTabs";
import { carregaReceitasDoMes } from "../../relatorios/receitas/carrega";
import { montaGrade } from "../../relatorios/receitas/dados";

const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const diaSemana = (iso: string) => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][new Date(iso + "T00:00:00Z").getUTCDay()];

export default async function ProvisaoReceitasPage({ searchParams }: { searchParams: { mes?: string } }) {
  const supabase = createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const mes = /^\d{4}-\d{2}$/.test(searchParams.mes ?? "") ? searchParams.mes! : hoje.slice(0, 7);

  const { company, rel } = await carregaReceitasDoMes(supabase, mes);
  if (!company || !rel) {
    return (
      <div>
        <PageHeader title="FP&A" subtitle="Provisão de receitas" />
        <FpaTabs ativa="provisao" />
        <p className="text-sm text-red-600">Empresa "Pagsmile IP" não encontrada no cadastro.</p>
      </div>
    );
  }

  const grade = montaGrade(mes, rel);
  const tipos = rel.tipos.filter((t) => t.itens.length > 0);
  const th = "px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap";
  const tdNum = "px-3 py-1.5 text-right tabular-nums whitespace-nowrap";
  const totalDia = (dia: string) => {
    const l = grade.celulas[dia] ?? {};
    return Object.values(l).reduce((s, c) => ({ real: s.real + c.real, proj: s.proj + c.proj }), { real: 0, proj: 0 });
  };

  return (
    <div>
      <PageHeader title="FP&A" subtitle={`Provisão de receitas — ${company.trade_name || company.legal_name}, projetado × realizado por competência`} />
      <FpaTabs ativa="provisao" />

      <form className="flex flex-wrap items-center gap-3 mb-5">
        <input type="month" name="mes" defaultValue={mes} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm" />
        <button className="text-sm text-ps-navy underline" type="submit">
          Atualizar
        </button>
      </form>

      {tipos.length === 0 ? (
        <p className="text-sm text-ps-muted">Nenhuma receita com competência neste mês.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-ps shadow-ps-sm border border-ps-navy/5">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-ps-bg-2 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-ps-muted whitespace-nowrap">Data de competência</th>
                {grade.colunas.map((c) => (
                  <th key={c} className={th}>
                    {c}
                  </th>
                ))}
                <th className={th}>Total do dia</th>
              </tr>
            </thead>
            <tbody>
              {grade.dias.map((dia) => {
                const fimDeSemana = [0, 6].includes(new Date(dia + "T00:00:00Z").getUTCDay());
                const t = totalDia(dia);
                return (
                  <tr key={dia} className={`border-t border-ps-navy/5 ${fimDeSemana ? "bg-ps-bg-2/40" : ""}`}>
                    <td className="px-3 py-1.5 whitespace-nowrap font-medium text-ps-ink">
                      {dataBR(dia)} <span className="text-[10px] text-ps-muted font-normal">{diaSemana(dia)}</span>
                    </td>
                    {grade.colunas.map((c) => {
                      const cel = grade.celulas[dia]?.[c];
                      return (
                        <td key={c} className={tdNum}>
                          {cel && cel.real !== 0 && <div>{brl(cel.real)}</div>}
                          {cel && cel.proj !== 0 && <div className="text-ps-muted italic">{brl(cel.proj)}</div>}
                        </td>
                      );
                    })}
                    <td className={`${tdNum} font-semibold`}>
                      {t.real !== 0 && <div>{brl(t.real)}</div>}
                      {t.proj !== 0 && <div className="text-ps-muted italic font-normal">{brl(t.proj)}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ps-navy/15 bg-ps-bg-2/60 font-semibold">
                <td className="px-3 py-2">Realizado</td>
                {tipos.map((t) => (
                  <td key={t.label} className={tdNum}>{brl(t.real)}</td>
                ))}
                <td className={tdNum}>{brl(rel.receitaBruta.real)}</td>
              </tr>
              <tr className="bg-ps-bg-2/60 text-ps-muted italic">
                <td className="px-3 py-2">Projetado</td>
                {tipos.map((t) => (
                  <td key={t.label} className={tdNum}>{brl(t.projetado)}</td>
                ))}
                <td className={tdNum}>{brl(rel.receitaBruta.projetado)}</td>
              </tr>
              <tr className="bg-ps-navy-50/60 font-bold">
                <td className="px-3 py-2">Total do mês</td>
                {tipos.map((t) => (
                  <td key={t.label} className={tdNum}>{brl(t.total)}</td>
                ))}
                <td className={tdNum}>{brl(rel.receitaBruta.total)}</td>
              </tr>
              <tr className="bg-ps-bg-2/60">
                <td className="px-3 py-2">% realizado</td>
                {tipos.map((t) => (
                  <td key={t.label} className={tdNum}>{t.total ? `${Math.round((t.real / t.total) * 100)}%` : "—"}</td>
                ))}
                <td className={tdNum}>{rel.receitaBruta.total ? `${Math.round((rel.receitaBruta.real / rel.receitaBruta.total) * 100)}%` : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-ps-muted mt-4">
        Só Pagsmile IP, por competência. <strong>Realizado</strong> (preto) = receitas já recebidas; <strong>projetado</strong> (cinza, itálico) =
        receitas estimadas, como a projeção da Central Piloto e as faturas ainda não recebidas. Receita faturada (Bets, mensalidade, China) cai
        no último dia do mês, na competência da fatura. Fee China é separado do Fee Pix pela descrição. Para ver os lançamentos de cada tipo, use
        Relatórios → Receitas do mês.
      </p>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { hojeBR, totalDe } from "@/lib/calculations/centralPiloto";
import { planejarProjecao, ultimasApuracoes } from "./projecao";
import { ReceitaDiaTable, type ReceitaDiaRow } from "./ReceitaDiaTable";

export default async function CentralPilotoPage({
  searchParams,
}: {
  searchParams: { date_from?: string; date_to?: string };
}) {
  const supabase = createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name")
    .or("trade_name.ilike.%Pagsmile IP%,legal_name.ilike.%Pagsmile IP%")
    .limit(1)
    .maybeSingle();

  if (!company) {
    return (
      <div>
        <PageHeader title="Central Piloto" subtitle="Receita do dia da Salva-Guarda" />
        <p className="text-sm text-red-600">Empresa "Pagsmile IP" não encontrada no cadastro.</p>
      </div>
    );
  }

  const hoje = hojeBR();
  const defaultFrom = hoje.slice(0, 8) + "01";
  const dataFim = new Date(Date.UTC(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const dateFrom = searchParams.date_from || defaultFrom;
  const dateTo = searchParams.date_to || dataFim;

  const [{ data: bankAccounts }, { data: existingRows }, ultimas] = await Promise.all([
    supabase.from("bank_accounts").select("id, nickname, bank_name").eq("company_id", company.id).order("nickname"),
    supabase
      .from("salva_guarda_diario")
      .select("*")
      .eq("company_id", company.id)
      .gte("data", dateFrom)
      .lte("data", dateTo),
    ultimasApuracoes(supabase, company.id, 5),
  ]);

  const existingByDate = new Map((existingRows ?? []).map((r: any) => [r.data, r]));
  const bancoPadraoId = ultimas[0]?.bankAccountId ?? null;

  // projeção do restante do mês (média por tipo das 5 últimas apurações), só do mês corrente
  const refProjecao = hoje >= dateFrom && hoje <= dateTo ? hoje : dateTo;
  const plano = await planejarProjecao(supabase, company.id, refProjecao, hoje);

  const rows: ReceitaDiaRow[] = [];
  for (let d = new Date(dateFrom + "T00:00:00Z"); d.toISOString().slice(0, 10) <= dateTo; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const futuro = day > hoje;
    const ex = existingByDate.get(day) as any;

    if (futuro) {
      // futuro não se lança: aparece só a projeção, nos dias úteis que ela cobre
      if (!plano || !plano.dias.includes(day)) continue;
      rows.push({
        data: day,
        feePix: plano.medias.fee_pix,
        feeTed: plano.medias.fee_ted,
        feeOnboarding: plano.medias.fee_onboarding,
        remSpi: plano.medias.rem_spi,
        remCcme: plano.medias.rem_ccme,
        bankAccountId: plano.bankAccountId,
        total: plano.total,
        tipo: "projecao",
      });
      continue;
    }

    const feePix = ex?.fee_pix != null ? Number(ex.fee_pix) : ex?.fee != null && ex?.fee_ted == null && ex?.fee_onboarding == null ? Number(ex.fee) : null;
    const feeTed = ex?.fee_ted != null ? Number(ex.fee_ted) : null;
    const feeOnboarding = ex?.fee_onboarding != null ? Number(ex.fee_onboarding) : null;
    const remSpi = ex?.remuneracao_spi != null ? Number(ex.remuneracao_spi) : null;
    const remCcme = ex?.remuneracao_ccme != null ? Number(ex.remuneracao_ccme) : null;
    const lancado = !!ex && (feePix != null || feeTed != null || feeOnboarding != null || remSpi != null || remCcme != null);

    rows.push({
      data: day,
      feePix,
      feeTed,
      feeOnboarding,
      remSpi,
      remCcme,
      bankAccountId: ex?.receipt_bank_account_id ?? ex?.fee_bank_account_id ?? ex?.remuneracao_spi_bank_account_id ?? ex?.remuneracao_ccme_bank_account_id ?? null,
      total: lancado ? (ex?.total_apurado != null ? Number(ex.total_apurado) : totalDe({ fee_pix: feePix, fee_ted: feeTed, fee_onboarding: feeOnboarding, rem_spi: remSpi, rem_ccme: remCcme })) : 0,
      // "modelo antigo": dia com três receitas separadas, ainda não convertido para a receita única
      tipo: lancado ? (ex?.revenue_id ? "lancado" : "legado") : "vazio",
    });
  }

  return (
    <div>
      <PageHeader
        title="Central Piloto"
        subtitle="Receita do dia da Salva-Guarda — informe cada tipo e o banco de recebimento"
        actions={
          <Link
            href="/operacoes/central-piloto/relatorio"
            className="bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors"
          >
            Relatório diário
          </Link>
        }
      />

      <AutoSubmitForm className="flex flex-wrap gap-3 mb-6" dateBlurSubmit={false}>
        <input type="date" name="date_from" defaultValue={dateFrom} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white" />
        <input type="date" name="date_to" defaultValue={dateTo} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white" />
        <button className="text-sm text-ps-navy underline" type="submit">Filtrar</button>
      </AutoSubmitForm>

      <ReceitaDiaTable
        companyId={company.id}
        rows={rows}
        bancoPadraoId={bancoPadraoId}
        bankAccounts={(bankAccounts ?? []).map((a: any) => ({ id: a.id, label: a.nickname ?? a.bank_name }))}
      />

      <p className="text-xs text-ps-muted mt-4">
        Ao salvar, o sistema soma as cinco colunas no <strong>Total apurado</strong> e lança <strong>uma receita única</strong> já
        recebida, no banco de recebimento escolhido — ela aparece em Receitas e no Cash Flow, e é esse total que casa com o crédito
        do extrato. Cada tipo mantém a sua categoria para a DRE. As linhas em cinza são a <strong>projeção</strong> do restante do
        mês: média por tipo das 5 últimas apurações, provisionada nos dias úteis e recalculada a cada lançamento. A receita lançada
        por aqui só pode ser alterada aqui; datas futuras não podem ser lançadas.
      </p>
    </div>
  );
}

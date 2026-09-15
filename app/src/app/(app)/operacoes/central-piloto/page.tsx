import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { getAccountBalanceAsOf, getAccountOutflowsOnDay } from "@/lib/calculations/accountBalance";
import { SalvaGuardaTable, type SalvaGuardaRow } from "./SalvaGuardaTable";

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
        <PageHeader title="Central Piloto" subtitle="Tabelão da Salva-Guarda" />
        <p className="text-sm text-red-600">Empresa "Pagsmile IP" não encontrada no cadastro.</p>
      </div>
    );
  }

  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const dateFrom = searchParams.date_from || defaultFrom;
  const dateTo = searchParams.date_to || defaultTo;

  const diaAntesDoInicio = new Date(dateFrom + "T00:00:00Z");
  diaAntesDoInicio.setUTCDate(diaAntesDoInicio.getUTCDate() - 1);
  const dataSemente = diaAntesDoInicio.toISOString().slice(0, 10);

  const [{ data: bankAccounts }, { data: existingRows }, { data: administrativoAccount }, { data: rowSemente }] = await Promise.all([
    supabase.from("bank_accounts").select("id, nickname, bank_name").eq("company_id", company.id).order("nickname"),
    supabase
      .from("salva_guarda_diario")
      .select("*")
      .eq("company_id", company.id)
      .gte("data", dateFrom)
      .lte("data", dateTo),
    supabase
      .from("bank_accounts")
      .select("id")
      .eq("company_id", company.id)
      .or("nickname.ilike.%administrativo%,nickname.ilike.%SPB%")
      .limit(1)
      .maybeSingle(),
    // um dia antes do início do período: só pra ter de onde puxar o cálculo da Remuneração
    // CCME do primeiro dia mostrado (ela depende do saldo custodiado no dia anterior)
    supabase
      .from("salva_guarda_diario")
      .select("saldo_em_conta, deixar_na_ccme, taxa_ccme")
      .eq("company_id", company.id)
      .eq("data", dataSemente)
      .maybeSingle(),
  ]);

  const existingByDate = new Map((existingRows ?? []).map((r: any) => [r.data, r]));

  // dia a dia, incluindo fim de semana — o piloto precisa continuar informando saldo em conta
  // todo dia, não só nos dias úteis
  const days: string[] = [];
  for (let d = new Date(dateFrom + "T00:00:00Z"); d.toISOString().slice(0, 10) <= dateTo; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const saldosAdmin = administrativoAccount
    ? await Promise.all(days.map((day) => getAccountBalanceAsOf(supabase, administrativoAccount.id, company.id, day)))
    : days.map(() => null);

  // Retiradas = saídas reais da conta Administrativo/SPB naquele dia — lido ao vivo, não digitado
  const retiradasPorDia = administrativoAccount
    ? await Promise.all(days.map((day) => getAccountOutflowsOnDay(supabase, administrativoAccount.id, company.id, day)))
    : days.map(() => null);

  // Remuneração CCME não é digitada: acumula sobre o custodiado no dia ANTERIOR (Valor Aplicado
  // Salva-Guarda + Deixar na CCME de ontem) × Taxa CCME de ontem. Quando já foi salva, usa o
  // valor gravado (é o que realmente virou receita); senão calcula a partir do dia anterior.
  let ontemSaldoEmConta = rowSemente?.saldo_em_conta != null ? Number(rowSemente.saldo_em_conta) : null;
  let ontemDeixarNaCcme = rowSemente?.deixar_na_ccme != null ? Number(rowSemente.deixar_na_ccme) : null;
  let ontemTaxaCcme = rowSemente?.taxa_ccme != null ? Number(rowSemente.taxa_ccme) : 0.0005166;

  const rows: SalvaGuardaRow[] = days.map((day, i) => {
    const existing = existingByDate.get(day) as any;
    const saldoEmConta = existing?.saldo_em_conta != null ? Number(existing.saldo_em_conta) : null;
    const deixarNaCcme = existing?.deixar_na_ccme != null ? Number(existing.deixar_na_ccme) : null;
    const saldo4111 = existing?.saldo_4111 != null ? Number(existing.saldo_4111) : null;
    const taxaCcme = existing?.taxa_ccme != null ? Number(existing.taxa_ccme) : 0.0005166;
    const valorAplicado = saldoEmConta != null ? saldoEmConta - 80000 : null;
    const gap = saldo4111 && valorAplicado != null && deixarNaCcme != null ? (valorAplicado + deixarNaCcme) / saldo4111 : null;

    // se o dia já foi salvo, usa o que está gravado (mesmo que seja null/zero — foi assim que
    // o piloto lançou). Só calcula uma prévia ao vivo quando o dia NUNCA foi salvo, senão um
    // dia com CCME zerado de propósito (ex.: fim de semana no histórico antigo) mostrava um
    // valor calculado bem diferente do que realmente aconteceu
    const ontemValorAplicado = ontemSaldoEmConta != null ? ontemSaldoEmConta - 80000 : null;
    const remuneracaoCcme = existing
      ? existing.remuneracao_ccme != null
        ? Number(existing.remuneracao_ccme)
        : null
      : ontemValorAplicado != null && ontemDeixarNaCcme != null
      ? (ontemValorAplicado + ontemDeixarNaCcme) * ontemTaxaCcme
      : null;

    // prepara a semente pro próximo dia do loop
    ontemSaldoEmConta = saldoEmConta;
    ontemDeixarNaCcme = deixarNaCcme;
    ontemTaxaCcme = taxaCcme;

    return {
      data: day,
      saldoEmConta,
      fee: existing?.fee != null ? Number(existing.fee) : null,
      remuneracaoSpi: existing?.remuneracao_spi != null ? Number(existing.remuneracao_spi) : null,
      remuneracaoCcme,
      bankAccountId: existing?.fee_bank_account_id ?? existing?.remuneracao_spi_bank_account_id ?? existing?.remuneracao_ccme_bank_account_id ?? null,
      saldoAdmin: saldosAdmin[i],
      valorAplicadoSalvaGuarda: valorAplicado,
      saldo4111,
      gap,
      taxaCcme,
      retiradas: retiradasPorDia[i],
      deixarNaCcme,
    };
  });

  return (
    <div>
      <PageHeader
        title="Central Piloto"
        subtitle="Tabelão da Salva-Guarda — saldo da conta PI (próprio + todos os clientes)"
        actions={
          <Link
            href="/operacoes/central-piloto/relatorio"
            className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
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

      <SalvaGuardaTable
        companyId={company.id}
        rows={rows}
        bankAccounts={(bankAccounts ?? []).map((a: any) => ({ id: a.id, label: a.nickname ?? a.bank_name }))}
      />

      <p className="text-xs text-ps-muted mt-4">
        Fee, Remuneração SPI e Remuneração CCME viram receita automaticamente (já recebida, no
        banco escolhido na linha) assim que a linha é salva. Saldo Admin é lido ao vivo da conta
        Administrativo/SPB — não precisa digitar. Valor Aplicado Salva-Guarda = Saldo em conta −
        R$80.000. Remuneração CCME é calculada, não digitada: (Aplicado + Deixar na CCME do dia
        anterior) × Taxa CCME do dia anterior. Retiradas também é lida ao vivo — soma das saídas
        reais da conta Administrativo/SPB naquele dia. GAP 4111 - Salva-Guarda = (Valor Aplicado +
        Deixar na CCME) ÷ Saldo 4111.
      </p>
    </div>
  );
}

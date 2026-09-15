import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { ReportCard } from "../ReportCard";
import { getPagsmileIpCompany, getReportData } from "../reportData";

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function RelatorioDiarioPage({ searchParams }: { searchParams: { data?: string } }) {
  const supabase = createClient();
  const company = await getPagsmileIpCompany(supabase);

  if (!company) {
    return (
      <div>
        <PageHeader title="Relatório diário" subtitle="Central Piloto" />
        <p className="text-sm text-red-600">Empresa "Pagsmile IP" não encontrada no cadastro.</p>
      </div>
    );
  }

  const data = searchParams.data || new Date().toISOString().slice(0, 10);
  const report = await getReportData(supabase, company.id, data);

  return (
    <div>
      <PageHeader
        title="Relatório diário"
        subtitle="Pronto pra enviar — mesma visão em tela ou em PDF"
        actions={
          <div className="flex gap-2">
            <Link href="/operacoes/central-piloto" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
              Voltar ao tabelão
            </Link>
            <a
              href={`/print/salva-guarda/${data}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
            >
              🖨️ Imprimir / PDF
            </a>
          </div>
        }
      />

      <div className="flex items-center justify-center gap-3 mb-6">
        <Link
          href={`/operacoes/central-piloto/relatorio?data=${addDays(data, -1)}`}
          className="w-8 h-8 flex items-center justify-center rounded-ps-sm border border-ps-navy/15 bg-white text-ps-ink hover:bg-ps-bg-2 transition-colors"
        >
          ‹
        </Link>
        <AutoSubmitForm>
          <input type="date" name="data" defaultValue={data} className="rounded-ps-sm border border-ps-navy/15 px-3 py-1.5 text-sm bg-white" />
        </AutoSubmitForm>
        <Link
          href={`/operacoes/central-piloto/relatorio?data=${addDays(data, 1)}`}
          className="w-8 h-8 flex items-center justify-center rounded-ps-sm border border-ps-navy/15 bg-white text-ps-ink hover:bg-ps-bg-2 transition-colors"
        >
          ›
        </Link>
      </div>

      <ReportCard data={report} />
    </div>
  );
}

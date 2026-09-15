import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportCard } from "@/app/(app)/operacoes/central-piloto/ReportCard";
import { getPagsmileIpCompany, getReportData } from "@/app/(app)/operacoes/central-piloto/reportData";
import { AutoPrint } from "../../faturamento/[id]/AutoPrint";

export default async function SalvaGuardaPrintPage({ params }: { params: { data: string } }) {
  const supabase = createClient();
  const company = await getPagsmileIpCompany(supabase);
  if (!company) notFound();

  const report = await getReportData(supabase, company.id, params.data);

  return (
    <>
      <AutoPrint />
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: white; }
      `}</style>
      <div className="p-6">
        <ReportCard data={report} />
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotaDebitoDocument } from "@/app/(app)/faturamento/notas-debito/[id]/NDDoc";
import { AutoPrint } from "../../faturamento/[id]/AutoPrint";

export default async function NotaDebitoPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: nd } = await supabase.from("billing_debit_notes").select("*").eq("id", params.id).single();

  if (!nd) notFound();

  return (
    <>
      <AutoPrint />
      <style>{`
        @media print {
          @page { margin: 1.2cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { background: white; }
      `}</style>
      <NotaDebitoDocument nd={nd} />
    </>
  );
}

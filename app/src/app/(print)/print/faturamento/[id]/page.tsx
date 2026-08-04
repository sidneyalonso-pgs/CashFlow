import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDocument } from "@/app/(app)/faturamento/[id]/InvoiceDoc";
import { AutoPrint } from "./AutoPrint";

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: inv } = await supabase
    .from("billing_invoices")
    .select("*, billing_clients(*, billing_subcontas(*))")
    .eq("id", params.id)
    .single();

  if (!inv) notFound();

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
      <InvoiceDocument inv={inv} />
    </>
  );
}

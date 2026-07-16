import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/calculations/money";
import { PaymentActions } from "./PaymentActions";
import { AttachmentUploader } from "./AttachmentUploader";
import { AttachmentList } from "./AttachmentList";

export default async function PaymentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*, companies(legal_name), suppliers(legal_name), categories(name), cost_centers(name)")
    .eq("id", params.id)
    .single();

  if (!payment) notFound();

  const [{ data: attachments }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("attachments")
      .select("id, storage_path, original_name, size_bytes, created_at")
      .eq("entity_type", "payment")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("bank_accounts").select("id, bank_name, nickname").eq("company_id", payment.company_id),
  ]);

  return (
    <div>
      <PageHeader
        title={payment.description}
        subtitle={`${payment.companies?.legal_name ?? ""} · ${payment.suppliers?.legal_name ?? ""}`}
        actions={<StatusBadge status={payment.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
            <h3 className="font-semibold text-ps-ink mb-3">Detalhes</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ps-muted">Valor</dt>
              <dd className="tabular-nums">{payment.gross_amount ? formatBRL(payment.gross_amount) : "—"}</dd>
              <dt className="text-ps-muted">Categoria</dt>
              <dd>{payment.categories?.name ?? "—"}</dd>
              <dt className="text-ps-muted">Centro de custo</dt>
              <dd>{payment.cost_centers?.name ?? "—"}</dd>
              <dt className="text-ps-muted">Data do pagamento</dt>
              <dd>{payment.effective_payment_date ?? "—"}</dd>
              <dt className="text-ps-muted">Recorrente</dt>
              <dd>{payment.recurring ? "Sim" : "Não"}</dd>
              {payment.notes && (
                <>
                  <dt className="text-ps-muted">Observações</dt>
                  <dd>{payment.notes}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ps-ink">Anexos</h3>
              <AttachmentUploader paymentId={payment.id} />
            </div>
            <AttachmentList attachments={attachments ?? []} />
          </div>
        </div>

        <div className="space-y-6">
          <PaymentActions paymentId={payment.id} status={payment.status} bankAccounts={bankAccounts ?? []} />
        </div>
      </div>
    </div>
  );
}

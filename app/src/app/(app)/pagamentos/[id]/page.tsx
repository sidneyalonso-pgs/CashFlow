import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/calculations/money";
import { PaymentActions } from "./PaymentActions";
import { RealizationForm } from "./RealizationForm";
import { AttachmentUploader } from "./AttachmentUploader";
import { AttachmentList } from "./AttachmentList";

export default async function PaymentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "*, companies(legal_name), suppliers(legal_name), categories(name), payment_realizations(id, amount, paid_at)"
    )
    .eq("id", params.id)
    .single();

  if (!payment) notFound();

  const [{ data: attachments }, { data: approvals }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("attachments")
      .select("id, storage_path, original_name, size_bytes, created_at")
      .eq("entity_type", "payment")
      .eq("entity_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("approvals")
      .select("id, decision, notes, created_at")
      .eq("payment_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("bank_accounts").select("id, bank_name, nickname").eq("company_id", payment.company_id),
  ]);

  const totalPaid = (payment.payment_realizations ?? []).reduce(
    (sum: number, r: any) => sum + Number(r.amount),
    0
  );

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
              <dt className="text-ps-muted">Valor bruto</dt>
              <dd className="tabular-nums">{formatBRL(payment.gross_amount)}</dd>
              <dt className="text-ps-muted">Valor líquido</dt>
              <dd className="tabular-nums">{formatBRL(payment.net_amount)}</dd>
              <dt className="text-ps-muted">Valor pago</dt>
              <dd className="tabular-nums">{formatBRL(totalPaid)}</dd>
              <dt className="text-ps-muted">Categoria</dt>
              <dd>{payment.categories?.name ?? "—"}</dd>
              <dt className="text-ps-muted">Documento</dt>
              <dd>{payment.document_number}</dd>
              <dt className="text-ps-muted">Data do documento</dt>
              <dd>{payment.document_date}</dd>
              <dt className="text-ps-muted">Vencimento</dt>
              <dd>{payment.due_date}</dd>
              <dt className="text-ps-muted">Previsão de pagamento</dt>
              <dd>{payment.expected_payment_date}</dd>
              <dt className="text-ps-muted">Competência</dt>
              <dd>{payment.competence_date}</dd>
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

          {approvals && approvals.length > 0 && (
            <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
              <h3 className="font-semibold text-ps-ink mb-3">Histórico de aprovação</h3>
              <ul className="space-y-2">
                {approvals.map((a) => (
                  <li key={a.id} className="text-sm border-l-2 border-ps-navy/10 pl-3">
                    <span className="font-medium capitalize">{a.decision}</span>
                    {a.notes && <span className="text-ps-muted"> — {a.notes}</span>}
                    <div className="text-xs text-ps-muted">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <PaymentActions paymentId={payment.id} status={payment.status} />
          {(payment.status === "aprovado" || payment.status === "pago_parcialmente") && (
            <RealizationForm paymentId={payment.id} bankAccounts={bankAccounts ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}

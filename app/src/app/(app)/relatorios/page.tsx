import { PageHeader } from "@/components/PageHeader";
import { ExportPaymentsButton } from "./ExportPaymentsButton";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exportações gerenciais" />
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
        <h3 className="font-semibold text-ps-ink mb-3">Pagamentos</h3>
        <p className="text-sm text-ps-muted mb-4">
          Exporta todos os pagamentos ativos (não cancelados/excluídos) em CSV.
        </p>
        <ExportPaymentsButton />
      </div>
    </div>
  );
}

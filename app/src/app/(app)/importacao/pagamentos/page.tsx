import { PageHeader } from "@/components/PageHeader";
import { ImportWizard } from "./ImportWizard";

export default function ImportPaymentsPage() {
  return (
    <div>
      <PageHeader title="Importação de pagamentos" subtitle="Importar pagamentos em lote via planilha Excel/CSV" />
      <ImportWizard />
    </div>
  );
}

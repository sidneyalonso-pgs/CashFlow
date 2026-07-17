import { PageHeader } from "@/components/PageHeader";
import { ImportRecurringWizard } from "./ImportRecurringWizard";

export default function ImportRecurringTemplatesPage() {
  return (
    <div>
      <PageHeader
        title="Importar pagamentos recorrentes"
        subtitle="Suba em massa a base de fornecedores recorrentes (contas a pagar)"
      />
      <ImportRecurringWizard />
    </div>
  );
}

import { PageHeader } from "@/components/PageHeader";
import { NovaNotaDebitoForm } from "./NovaNotaDebitoForm";

export default function NovaNotaDebitoPage() {
  return (
    <div>
      <PageHeader title="Nova nota de débito" subtitle="Reembolso ou rateio entre empresas" />
      <NovaNotaDebitoForm />
    </div>
  );
}

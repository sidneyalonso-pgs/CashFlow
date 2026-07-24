import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { ImportRevenueWizard } from "./ImportRevenueWizard";

export default function ImportRevenuePage() {
  return (
    <div>
      <PageHeader
        title="Importar receitas"
        subtitle="Lançamento em massa via planilha Excel"
        actions={
          <Link
            href="/receitas"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar
          </Link>
        }
      />
      <ImportRevenueWizard />
    </div>
  );
}

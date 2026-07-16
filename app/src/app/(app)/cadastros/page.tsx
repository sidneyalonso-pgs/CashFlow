import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const REGISTRATIONS = [
  { href: "/cadastros/empresas", label: "Empresas", description: "Empresas do grupo" },
  { href: "/cadastros/contas-bancarias", label: "Contas bancárias", description: "Contas correntes, pagamento e investimento" },
  { href: "/cadastros/fornecedores", label: "Fornecedores", description: "Fornecedores e prestadores de serviço" },
  { href: "/cadastros/categorias", label: "Categorias", description: "Classificação de entradas e saídas" },
  { href: "/cadastros/centros-de-custo", label: "Centros de custo", description: "Estrutura de centros de custo" },
  { href: "/cadastros/projetos", label: "Projetos", description: "Projetos por empresa e centro de custo" },
];

export default function RegistrationsIndexPage() {
  return (
    <div>
      <PageHeader title="Cadastros" subtitle="Estruturas base utilizadas em todo o sistema" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REGISTRATIONS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 hover:shadow-ps transition-shadow"
          >
            <h3 className="font-semibold text-ps-ink">{r.label}</h3>
            <p className="text-sm text-ps-muted mt-1">{r.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

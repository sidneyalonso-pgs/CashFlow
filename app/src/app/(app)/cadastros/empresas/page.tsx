import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { NewCompanyButton } from "./NewCompanyButton";
import { EditCompanyButton } from "./EditCompanyButton";

export default async function CompaniesPage() {
  const supabase = createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, legal_name, trade_name, cnpj, default_currency, status")
    .order("legal_name");

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle="Cadastro das empresas do grupo"
        actions={<NewCompanyButton />}
      />

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Razão social</th>
              <th className="text-left px-4 py-3">Nome fantasia</th>
              <th className="text-left px-4 py-3">CNPJ</th>
              <th className="text-left px-4 py-3">Moeda</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(companies ?? []).map((c) => (
              <tr key={c.id} className="border-t border-ps-navy/5">
                <td className="px-4 py-3 font-medium text-ps-ink">{c.legal_name}</td>
                <td className="px-4 py-3 text-ps-muted">{c.trade_name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ps-muted">{c.cnpj}</td>
                <td className="px-4 py-3">{c.default_currency}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <EditCompanyButton company={c} />
                </td>
              </tr>
            ))}
            {(!companies || companies.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ps-muted">
                  Nenhuma empresa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

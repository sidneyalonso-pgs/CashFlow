import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ClienteForm } from "./ClienteForm";
import { formatBRL } from "@/lib/calculations/money";

const MODELO_LABEL: Record<string, string> = { transacao: "Por transação", mensalidade: "Mensalidade" };
const TIPO_LABEL: Record<string, string> = { fixo: "Fixo R$", perc: "% volume", fixo_perc: "Fixo + %" };

export default async function BillingClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("billing_clients")
    .select("*")
    .order("razao");

  return (
    <div>
      <PageHeader title="Merchants" subtitle="Clientes de faturamento — quem você fatura" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
            <h3 className="font-semibold text-ps-ink text-sm mb-4">Novo merchant</h3>
            <ClienteForm />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-ps-navy/5">
              <h3 className="font-semibold text-ps-ink text-sm">Merchants cadastrados</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Razão Social</th>
                  <th className="text-left px-4 py-3">CNPJ</th>
                  <th className="text-left px-4 py-3">Modelo</th>
                  <th className="text-left px-4 py-3">Fee IN</th>
                  <th className="text-left px-4 py-3">Fee OUT</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(clients ?? []).map((c: any) => (
                  <tr key={c.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/50">
                    <td className="px-4 py-3 font-medium text-ps-ink">{c.razao}</td>
                    <td className="px-4 py-3 text-ps-muted text-xs">{c.cnpj || "—"}</td>
                    <td className="px-4 py-3 text-xs">{MODELO_LABEL[c.modelo] ?? c.modelo}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {c.modelo === "mensalidade" ? "—" : `${TIPO_LABEL[c.in_tipo] ?? c.in_tipo}: ${formatBRL(c.in_val)}`}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {c.modelo === "mensalidade" ? "—" : `${TIPO_LABEL[c.out_tipo] ?? c.out_tipo}: ${formatBRL(c.out_val)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${c.status === "ativo" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(clients ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-ps-muted">Nenhum merchant cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

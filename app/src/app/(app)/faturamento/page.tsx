import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatBRL } from "@/lib/calculations/money";

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "red" | "amber" | "blue" }) {
  const tones = {
    green: "border-l-ps-green bg-white",
    red: "border-l-red-400 bg-white",
    amber: "border-l-amber-400 bg-white",
    blue: "border-l-blue-400 bg-white",
  };
  return (
    <div className={`rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 p-5 ${tones[tone ?? "blue"]}`}>
      <p className="text-xs text-ps-muted uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className="text-2xl font-bold text-ps-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ps-muted mt-1">{sub}</p>}
    </div>
  );
}

export default async function FaturamentoDashboard() {
  const supabase = createClient();
  const mesAtual = new Date().toISOString().slice(0, 7);

  const [{ data: invoices }, { data: clients }] = await Promise.all([
    supabase.from("billing_invoices").select("id, competencia, status, total, total_repasse, data_emissao, billing_clients(razao)").order("created_at", { ascending: false }).limit(20),
    supabase.from("billing_clients").select("id").eq("status", "ativo"),
  ]);

  const all = invoices ?? [];
  const doMes = all.filter((i: any) => i.competencia === mesAtual);
  const totalFaturado = doMes.reduce((s: number, i: any) => s + Number(i.total), 0);
  const totalRepasse = doMes.reduce((s: number, i: any) => s + Number(i.total_repasse), 0);
  const pendentes = all.filter((i: any) => i.status === "pendente").length;
  const clientesAtivos = clients?.length ?? 0;

  const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
  const STATUS_CLS: Record<string, string> = {
    pendente: "bg-amber-50 text-amber-700",
    pago: "bg-green-50 text-green-700",
    cancelado: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <PageHeader
        title="Faturamento"
        subtitle="Demonstrativos de repasse e gestão de receitas de fee"
        actions={
          <div className="flex gap-2">
            <Link href="/faturamento/clientes" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
              Merchants
            </Link>
            <Link href="/faturamento/faturas" className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors">
              Todas as faturas
            </Link>
            <Link href="/faturamento/emitir" className="bg-ps-navy text-white text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors">
              Emitir demonstrativo
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Receita de fee (mês)" value={formatBRL(totalFaturado)} tone="green" />
        <StatCard label="Repasse a pagar (mês)" value={formatBRL(totalRepasse)} tone="red" />
        <StatCard label="Faturas pendentes" value={String(pendentes)} tone="amber" />
        <StatCard label="Merchants ativos" value={String(clientesAtivos)} tone="blue" />
      </div>

      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-ps-navy/5 flex items-center justify-between">
          <h3 className="font-semibold text-ps-ink text-sm">Faturas recentes</h3>
          <Link href="/faturamento/faturas" className="text-xs text-ps-navy underline">Ver todas</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Merchant</th>
              <th className="text-left px-4 py-3">Competência</th>
              <th className="text-left px-4 py-3">Emissão</th>
              <th className="text-right px-4 py-3">Fee (receita)</th>
              <th className="text-right px-4 py-3">Repasse</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {all.slice(0, 10).map((inv: any) => (
              <tr key={inv.id} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/50">
                <td className="px-4 py-3 font-medium text-ps-ink">{(inv.billing_clients as any)?.razao ?? "—"}</td>
                <td className="px-4 py-3 text-ps-muted">{inv.competencia}</td>
                <td className="px-4 py-3 text-ps-muted">{inv.data_emissao}</td>
                <td className="px-4 py-3 text-right tabular-nums text-ps-green-700 font-medium">{formatBRL(inv.total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatBRL(inv.total_repasse)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_CLS[inv.status] ?? ""}`}>
                    {STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/faturamento/${inv.id}`} className="text-xs text-ps-navy underline">Ver</Link>
                </td>
              </tr>
            ))}
            {all.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ps-muted">Nenhuma fatura emitida ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

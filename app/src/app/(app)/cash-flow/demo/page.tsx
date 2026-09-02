import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FinancialCard } from "@/components/FinancialCard";

// Tela 100% estática, sem nenhuma consulta ao banco — só para gerar prints/telas de
// demonstração (ex.: LinkedIn) com a mesma cara do Cash Flow real, mas com dados inventados.
const FAKE_ROWS = [
  { label: "01 a 07/set", inflows: "R$ 412.300,00", provInflows: "R$ 38.500,00", outflows: "R$ 289.140,00", provOutflows: "R$ 12.000,00", balance: "R$ 3.918.740,00", balanceInv: "R$ 4.402.110,00" },
  { label: "08 a 14/set", inflows: "R$ 356.980,00", provInflows: "—", outflows: "R$ 401.220,00", provOutflows: "R$ 54.300,00", balance: "R$ 3.874.500,00", balanceInv: "R$ 4.358.870,00" },
  { label: "15 a 21/set", inflows: "R$ 528.410,00", provInflows: "R$ 27.884,00", outflows: "R$ 214.760,00", provOutflows: "—", balance: "R$ 4.188.150,00", balanceInv: "R$ 4.672.520,00" },
  { label: "22 a 28/set", inflows: "R$ 480.020,00", provInflows: "R$ 50.000,00", outflows: "R$ 336.850,00", provOutflows: "R$ 7.145,00", balance: "R$ 4.331.320,00", balanceInv: "R$ 4.815.690,00" },
  { label: "29 a 30/set", inflows: "R$ 194.600,00", provInflows: "—", outflows: "R$ 106.532,00", provOutflows: "—", balance: "R$ 4.419.388,00", balanceInv: "R$ 4.903.758,00" },
];

export default function CashFlowDemoPage() {
  return (
    <div>
      <div className="mb-6 rounded-ps border-2 border-dashed border-amber-300 bg-amber-50 px-5 py-3 flex items-center gap-3">
        <span className="text-xl">⚠️</span>
        <p className="text-sm text-amber-800">
          <strong>Tela de demonstração — todos os valores, contas e datas abaixo são fictícios.</strong>{" "}
          Nenhum dado real da operação aparece aqui; ela existe só para gerar imagens de divulgação.
        </p>
      </div>

      <PageHeader
        title="Cash Flow"
        subtitle="Resumo executivo e evolução do saldo de caixa"
        actions={
          <Link
            href="/cash-flow"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Voltar ao Cash Flow real
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <select disabled defaultValue="" className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value="">Todas as empresas</option>
        </select>
        <select disabled defaultValue="todas" className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value="todas">Todas as contas</option>
        </select>
        <select disabled defaultValue="semana" className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value="semana">Por semana</option>
        </select>
        <select disabled defaultValue="realizados" className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value="realizados">Saldo realizado</option>
        </select>
        <select disabled defaultValue={9} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value={9}>Setembro</option>
        </select>
        <select disabled defaultValue={2026} className="rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white text-ps-muted">
          <option value={2026}>2026</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <FinancialCard label="Saldo C/C Inicial (01/09)" value="R$ 3.795.580,00" />
        <FinancialCard label="Total de Entradas" value="R$ 1.972.310,00" tone="positive" />
        <FinancialCard label="Total de Saídas" value="R$ 1.348.502,00" tone="negative" />
        <FinancialCard label="Saldo C/C (30/09)" value="R$ 4.419.388,00" tone="neutral" />
      </div>

      <p className="text-xs text-ps-muted mb-6">
        No período ainda há <strong className="text-amber-700">R$ 116.384,00 a receber</strong> e{" "}
        <strong className="text-amber-700">R$ 73.445,00 a pagar</strong> — fora do saldo acima, que mostra só o
        realizado. Troque para "Saldo projetado" para incluí-los.
      </p>

      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-semibold text-ps-ink">Evolução do Saldo — Semanal</h3>
      </div>
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ps-bg-2 text-ps-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Período</th>
              <th className="text-left px-4 py-3">Entradas</th>
              <th className="text-left px-4 py-3 text-amber-700">A receber</th>
              <th className="text-left px-4 py-3">Saídas</th>
              <th className="text-left px-4 py-3 text-amber-700">A pagar</th>
              <th className="text-left px-4 py-3">Saldo C/C</th>
              <th className="text-left px-4 py-3 text-ps-navy/70">Saldo C/C + Invest</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-ps-navy/5 bg-ps-bg-2/40">
              <td className="px-4 py-3 font-medium text-ps-ink">Saldo Inicial (01/09)</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 text-ps-muted">—</td>
              <td className="px-4 py-3 tabular-nums font-semibold">R$ 3.795.580,00</td>
              <td className="px-4 py-3 tabular-nums font-semibold text-ps-navy/70">R$ 4.278.950,00</td>
            </tr>
            {FAKE_ROWS.map((row) => (
              <tr key={row.label} className="border-t border-ps-navy/5 hover:bg-ps-bg-2/40">
                <td className="px-4 py-3 font-medium">
                  <span className="text-ps-navy">{row.label}</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-ps-green-700">{row.inflows}</td>
                <td className="px-4 py-3 tabular-nums text-amber-700">
                  {row.provInflows === "—" ? <span className="text-ps-muted">—</span> : row.provInflows}
                </td>
                <td className="px-4 py-3 tabular-nums text-red-600">{row.outflows}</td>
                <td className="px-4 py-3 tabular-nums text-amber-700">
                  {row.provOutflows === "—" ? <span className="text-ps-muted">—</span> : row.provOutflows}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{row.balance}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-ps-navy/70">{row.balanceInv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ps-muted mt-4">
        Saldo inicial do período = saldo cadastrado nas contas bancárias + todas as entradas e saídas realizadas
        até o dia anterior ao início do período selecionado. Entradas e Saídas são o que já foi baixado;
        "A receber" e "A pagar" são as provisões com vencimento naquele intervalo e aparecem sempre, mas só
        entram no saldo quando o filtro está em "Provisionados" ou "Ambos".
      </p>
    </div>
  );
}

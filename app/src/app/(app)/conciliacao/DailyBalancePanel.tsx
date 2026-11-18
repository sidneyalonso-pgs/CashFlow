import { formatBRL } from "@/lib/calculations/money";

export type DailyRow = {
  date: string;
  /** movimento líquido do dia segundo o extrato (entradas − saídas) */
  bankNet: number;
  /** saldo informado pelo banco no fim do dia (última linha do dia), quando o extrato traz */
  bankBalance: number | null;
  /** movimento líquido do dia no Treasury (mesma fórmula do saldo da conta) */
  treasuryNet: number;
  /** saldo do Treasury no fim do dia */
  treasuryBalance: number;
  /** linhas do extrato do dia ainda sem par: quantidade e valor líquido */
  openEntries: number;
  openEntriesNet: number;
  /** lançamentos baixados no Treasury no dia e ainda sem linha do extrato: valor líquido */
  openTreasuryNet: number;
};

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
const cents = (n: number) => Math.round(n * 100);

function Diff({ value }: { value: number }) {
  if (cents(value) === 0) return <span className="text-ps-green-700">✓</span>;
  return <span className="text-red-600 font-medium">{formatBRL(value)}</span>;
}

export function DailyBalancePanel({
  rows,
  accountLabel,
  periodLabel,
}: {
  rows: DailyRow[];
  accountLabel: string;
  periodLabel: string;
}) {
  if (rows.length === 0) return null;

  const withDiff = rows.filter((r) => cents(r.bankNet - r.treasuryNet) !== 0);
  const totalDiff = rows.reduce((s, r) => s + (r.bankNet - r.treasuryNet), 0);
  const last = rows[rows.length - 1];
  const lastBalanceDiff = last.bankBalance !== null ? last.bankBalance - last.treasuryBalance : null;

  return (
    <div className="border-b border-ps-navy/5 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
        <h4 className="text-sm font-semibold text-ps-ink">Saldo diário: banco x Treasury</h4>
        <span className="text-xs text-ps-muted">
          {accountLabel} · {periodLabel}
        </span>
        <span className={`text-xs font-medium ${withDiff.length === 0 ? "text-ps-green-700" : "text-amber-700"}`}>
          {withDiff.length === 0 ? "Todos os dias batem" : `${withDiff.length} dia(s) com diferença`}
        </span>
        {lastBalanceDiff !== null && (
          <span className="text-xs text-ps-muted">
            Saldo final: banco {formatBRL(last.bankBalance as number)} · Treasury {formatBRL(last.treasuryBalance)} ·
            diferença <Diff value={lastBalanceDiff} />
          </span>
        )}
        {lastBalanceDiff === null && withDiff.length > 0 && (
          <span className="text-xs text-ps-muted">Diferença acumulada no período: {formatBRL(totalDiff)}</span>
        )}
      </div>

      <div className="max-h-72 overflow-auto rounded-ps-sm border border-ps-navy/5 bg-white">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-ps-bg-2 text-ps-muted uppercase sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Data</th>
              <th className="text-right px-3 py-2">Banco (dia)</th>
              <th className="text-right px-3 py-2">Treasury (dia)</th>
              <th className="text-right px-3 py-2">Diferença</th>
              <th className="text-right px-3 py-2">Saldo banco</th>
              <th className="text-right px-3 py-2">Saldo Treasury</th>
              <th className="text-left px-3 py-2">O que explica</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const diff = r.bankNet - r.treasuryNet;
              const bad = cents(diff) !== 0;
              const parts: string[] = [];
              if (r.openEntries > 0) parts.push(`${r.openEntries} linha(s) do extrato sem par (${formatBRL(r.openEntriesNet)})`);
              if (cents(r.openTreasuryNet) !== 0) parts.push(`lançamentos do Treasury sem linha no extrato (${formatBRL(r.openTreasuryNet)})`);
              return (
                <tr key={r.date} className={`border-t border-ps-navy/5 ${bad ? "bg-red-50/40" : ""}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.bankNet)}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.treasuryNet)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Diff value={diff} />
                  </td>
                  <td className="px-3 py-1.5 text-right">{r.bankBalance !== null ? formatBRL(r.bankBalance) : "—"}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(r.treasuryBalance)}</td>
                  <td className="px-3 py-1.5 text-ps-muted">{bad ? parts.join(" · ") || "sem causa identificada" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

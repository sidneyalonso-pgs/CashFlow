import { formatBRL } from "@/lib/calculations/money";

export type SaldoPonto = { label: string; saldo: number; saldoInvest: number };

const W = 1000;
const H = 260;
const PAD = { l: 78, r: 24, t: 18, b: 40 };

/** Passo "redondo" para o eixo (1, 2, 5 × 10^n). */
function passoRedondo(range: number, alvo: number) {
  const bruto = range / alvo;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const f = bruto / mag;
  const nice = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nice * mag;
}

function compacto(v: number) {
  const abs = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${s}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${s}R$ ${(abs / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `${s}R$ ${abs.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/**
 * Evolução do saldo de caixa: área do Saldo C/C e linha tracejada do Saldo C/C + investimentos,
 * um ponto por período (o primeiro é o saldo inicial). SVG puro, sem biblioteca — a tela é
 * renderizada no servidor e o gráfico não precisa de interação além do valor ao passar o mouse.
 */
export function SaldoChart({ pontos, projetado }: { pontos: SaldoPonto[]; projetado: boolean }) {
  if (pontos.length < 2) return null;

  const valores = pontos.flatMap((p) => [p.saldo, p.saldoInvest]);
  let min = Math.min(0, ...valores);
  let max = Math.max(...valores);
  if (max === min) max = min + 1;
  const passo = passoRedondo(max - min, 4);
  min = Math.floor(min / passo) * passo;
  max = Math.ceil(max / passo) * passo;

  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (pontos.length - 1);
  const y = (v: number) => PAD.t + ((max - v) * (H - PAD.t - PAD.b)) / (max - min);

  const ticks: number[] = [];
  for (let v = min; v <= max + passo / 2; v += passo) ticks.push(v);

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.saldo).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos.length - 1).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} L${x(0).toFixed(1)},${y(Math.max(min, 0)).toFixed(1)} Z`;
  const linhaInvest = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.saldoInvest).toFixed(1)}`).join(" ");
  const temInvest = pontos.some((p) => Math.abs(p.saldoInvest - p.saldo) > 0.005);

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5 mb-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
        <h3 className="font-semibold text-ps-ink">Evolução do Saldo de Caixa</h3>
        <div className="flex items-center gap-4 text-xs text-ps-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ps-green rounded-full" />
            {projetado ? "Saldo C/C projetado" : "Saldo C/C"}
          </span>
          {temInvest && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-ps-navy/60" />
              Saldo C/C + Invest
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução do saldo de caixa por período" className="w-full h-auto">
        <defs>
          <linearGradient id="saldo-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2BC196" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2BC196" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#00243d" strokeOpacity={t === 0 ? 0.25 : 0.08} strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 10} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#5B6C7E">
              {compacto(t)}
            </text>
          </g>
        ))}

        {pontos.map((p, i) => (
          <text key={p.label + i} x={x(i)} y={H - 14} textAnchor={i === 0 ? "start" : i === pontos.length - 1 ? "end" : "middle"} fontSize="12" fill="#5B6C7E">
            {p.label}
          </text>
        ))}

        <path d={area} fill="url(#saldo-area)" />
        {temInvest && <path d={linhaInvest} fill="none" stroke="#002443" strokeOpacity="0.55" strokeWidth="1.75" strokeDasharray="5 5" strokeLinejoin="round" />}
        <path d={linha} fill="none" stroke="#2BC196" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {pontos.map((p, i) => (
          <g key={"d" + i}>
            <circle cx={x(i)} cy={y(p.saldo)} r="5" fill="#fff" stroke="#2BC196" strokeWidth="2.5">
              <title>{`${p.label}: ${formatBRL(p.saldo)}${temInvest ? ` · com investimentos ${formatBRL(p.saldoInvest)}` : ""}`}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

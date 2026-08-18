"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

function formatBRLShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (abs >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatBRLFull(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Saldo em linha e fluxo líquido em barra. As duas séries dividem o eixo porque estão na mesma
 * unidade e o fluxo líquido é justamente a variação do saldo — o que antes comprimia o gráfico
 * era plotar entradas e saídas brutas ao lado de um saldo de ordem de grandeza diferente.
 */
export function WeeklyFlowChart({
  data,
}: {
  data: Array<{ label: string; fluxo: number; saldo: number }>;
}) {
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h3 className="font-semibold text-ps-ink">Evolução do caixa</h3>
      <p className="text-xs text-ps-muted mt-0.5 mb-3">Saldo ao fim de cada semana e o fluxo líquido gerado nela</p>
      <ResponsiveContainer width="100%" height={252}>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.08)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatBRLShort} width={78} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v: number) => formatBRLFull(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="rgba(0,36,67,0.25)" />
          <Bar dataKey="fluxo" name="Fluxo líquido da semana" radius={[3, 3, 0, 0]} maxBarSize={38}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fluxo < 0 ? "#DC7A74" : "#8FE0C6"} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="saldo"
            name="Saldo de caixa"
            stroke="#002443"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#002443" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Responde "onde está concentrado o caixa do grupo" — barras horizontais, maior primeiro. */
export function CashByCompanyChart({
  data,
}: {
  data: Array<{ name: string; caixa: number; participacao: number | null }>;
}) {
  const temNegativo = data.some((d) => d.caixa < 0);
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h3 className="font-semibold text-ps-ink">Caixa por empresa</h3>
      <p className="text-xs text-ps-muted mt-0.5 mb-3">Onde está concentrado o caixa do grupo</p>
      <ResponsiveContainer width="100%" height={252}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 78, left: 8, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.08)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatBRLShort} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={132} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v: number, _n, item: any) => {
              const p = item?.payload?.participacao;
              return [p != null ? `${formatBRLFull(v)} — ${p.toFixed(0)}% do grupo` : formatBRLFull(v), "Caixa"];
            }}
          />
          {temNegativo && <ReferenceLine x={0} stroke="rgba(0,36,67,0.25)" />}
          <Bar dataKey="caixa" name="Caixa" radius={[0, 3, 3, 0]} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.caixa < 0 ? "#DC7A74" : "#2BC196"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

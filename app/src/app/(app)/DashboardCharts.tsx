"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatBRLShort(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function WeeklyFlowChart({ data }: { data: Array<{ label: string; entradas: number; saidas: number; saldo: number }> }) {
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h3 className="font-semibold text-ps-ink mb-4">Entradas x Saídas x Saldo — por semana</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatBRLShort(v)} width={90} />
          <Tooltip formatter={(v: number) => formatBRLShort(v)} />
          <Legend />
          <Bar dataKey="entradas" name="Entradas" fill="#2BC196" radius={[4, 4, 0, 0]} />
          <Bar dataKey="saidas" name="Saídas" fill="#e05252" radius={[4, 4, 0, 0]} />
          <Line dataKey="saldo" name="Saldo" stroke="#002443" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpensesByCategoryChart({ data }: { data: Array<{ name: string; total: number }> }) {
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h3 className="font-semibold text-ps-ink mb-4">Saídas por categoria (mês)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,36,67,0.08)" />
          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatBRLShort(v)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
          <Tooltip formatter={(v: number) => formatBRLShort(v)} />
          <Bar dataKey="total" name="Total" fill="#003566" radius={[0, 4, 4, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { simularDecisao, type Veredito } from "@/lib/calculations/executiveCash";

export type EmpresaSim = {
  id: string;
  label: string;
  caixa: number;
  investido: number;
  reserva: number | null;
};
/** Provisões futuras, para recalcular os compromissos até a data escolhida. */
export type Agenda = { companyId: string; amount: number; date: string };

const VEREDITOS: Record<Veredito, { rotulo: string; frase: string; classe: string; marca: string }> = {
  cabe_em_caixa: {
    rotulo: "Cabe em caixa",
    frase: "O saldo em conta da empresa cobre o desembolso, os compromissos do período e a reserva. Não exige resgate de investimento.",
    classe: "border-l-ps-green bg-ps-green/5",
    marca: "text-ps-green-700",
  },
  cabe_com_resgate: {
    rotulo: "Cabe com resgate",
    frase: "A decisão é suportada pelos recursos disponíveis, porém exige utilização de parte dos investimentos.",
    classe: "border-l-amber-500 bg-amber-50/60",
    marca: "text-amber-700",
  },
  requer_intercompany: {
    rotulo: "Requer movimentação entre empresas",
    frase: "A empresa pagadora não tem capacidade sozinha, mas o grupo tem. Depende de ser possível movimentar recurso entre as empresas — o sistema não confirma essa possibilidade.",
    classe: "border-l-amber-600 bg-amber-50/60",
    marca: "text-amber-800",
  },
  nao_comporta: {
    rotulo: "Não comporta",
    frase: "Nem a empresa nem o grupo têm recurso suficiente sem consumir os compromissos já assumidos ou a reserva operacional.",
    classe: "border-l-red-500 bg-red-50/60",
    marca: "text-red-700",
  },
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function porExtenso(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function DecisionSimulator({
  empresas,
  compromissos,
  recebiveis,
  hoje,
  reservaDefinida,
}: {
  empresas: EmpresaSim[];
  compromissos: Agenda[];
  recebiveis: Agenda[];
  hoje: string;
  reservaDefinida: boolean;
}) {
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje);

  const empresa = empresas.find((e) => e.id === empresaId) ?? empresas[0];
  const desembolso = Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
  const ate = data < hoje ? hoje : data;

  const resultado = useMemo(() => {
    if (!empresa || desembolso <= 0) return null;

    const janela = (rows: Agenda[], companyId?: string) =>
      rows
        .filter((r) => (companyId ? r.companyId === companyId : true) && r.date >= hoje && r.date <= ate)
        .reduce((s, r) => s + r.amount, 0);

    const grupo = empresas.reduce(
      (acc, e) => ({
        caixa: acc.caixa + e.caixa,
        investido: acc.investido + e.investido,
        reserva: e.reserva == null ? acc.reserva : (acc.reserva ?? 0) + e.reserva,
      }),
      { caixa: 0, investido: 0, reserva: null as number | null }
    );

    const sim = simularDecisao({
      caixa: empresa.caixa,
      investido: empresa.investido,
      reserva: empresa.reserva,
      compromissos: janela(compromissos, empresa.id),
      recebiveis: janela(recebiveis, empresa.id),
      desembolso,
      grupo: { ...grupo, compromissos: janela(compromissos) },
    });
    return { sim, recebiveisJanela: janela(recebiveis, empresa.id) };
  }, [empresa, desembolso, ate, hoje, compromissos, recebiveis, empresas]);

  const v = resultado ? VEREDITOS[resultado.sim.veredito] : null;
  const futuro = ate > hoje;

  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
      <h2 className="font-semibold text-ps-ink">Simular decisão</h2>
      <p className="text-xs text-ps-muted mt-0.5 mb-4">
        Informe o desembolso e veja se a estrutura suporta, sem consumir compromissos já assumidos nem a reserva
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <label className="block">
          <span className="block text-xs text-ps-muted mb-1">Empresa pagadora</span>
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          >
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-ps-muted mb-1">Valor do desembolso</span>
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="3.000.000,00"
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white tabular-nums"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-ps-muted mb-1">Data prevista</span>
          <input
            type="date"
            value={data}
            min={hoje}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white"
          />
        </label>
      </div>

      {!resultado || !v ? (
        <p className="text-sm text-ps-muted border-t border-ps-navy/5 pt-4">
          Informe um valor para ver o resultado.
        </p>
      ) : (
        <div className={`border border-ps-navy/5 border-l-4 rounded-ps-sm p-4 ${v.classe}`}>
          <p className={`font-bold text-base ${v.marca}`}>{v.rotulo}</p>
          <p className="text-sm text-ps-ink-2 mt-1 mb-4">{v.frase}</p>

          <dl className="text-sm space-y-1.5 max-w-lg">
            <Linha rotulo={`Disponibilidade de ${empresa.label}`} valor={brl(resultado.sim.disponibilidade)} />
            <Linha
              rotulo={futuro ? `Compromissos até ${porExtenso(ate)}` : "Compromissos a vencer"}
              valor={`−${brl(resultado.sim.compromissos)}`}
            />
            <Linha
              rotulo="Reserva operacional"
              valor={empresa.reserva == null ? "não definida" : `−${brl(resultado.sim.reserva)}`}
              atencao={empresa.reserva == null}
            />
            <Linha rotulo="Desembolso simulado" valor={`−${brl(resultado.sim.desembolso)}`} />
            <div className="flex justify-between gap-6 border-t-2 border-ps-navy/20 pt-2 mt-2 font-bold text-ps-ink">
              <dt className="uppercase text-xs tracking-wide self-center">Folga após a decisão</dt>
              <dd className={`tabular-nums text-lg ${resultado.sim.folga < 0 ? "text-red-600" : "text-ps-green-700"}`}>
                {brl(resultado.sim.folga)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 space-y-1 text-xs text-ps-muted">
            {resultado.sim.resgateNecessario > 0 && resultado.sim.veredito !== "nao_comporta" && (
              <p>Exigiria resgatar <strong className="text-ps-ink">{brl(resultado.sim.resgateNecessario)}</strong> de investimento.</p>
            )}
            {resultado.recebiveisJanela > 0 && (
              <p>
                Há <strong className="text-ps-ink">{brl(resultado.recebiveisJanela)}</strong> a receber até {porExtenso(ate)}, que
                não entram no cálculo acima — a folga é conservadora de propósito.
              </p>
            )}
            {!futuro && <p>Simulação baseada na posição atual.</p>}
            {!reservaDefinida && (
              <p className="text-amber-700">
                Nenhuma reserva operacional está cadastrada, então a folga não desconta reserva nenhuma e está superestimada.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ rotulo, valor, atencao }: { rotulo: string; valor: string; atencao?: boolean }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-ps-muted">{rotulo}</dt>
      <dd className={`tabular-nums ${atencao ? "text-amber-700" : "text-ps-ink"}`}>{valor}</dd>
    </div>
  );
}

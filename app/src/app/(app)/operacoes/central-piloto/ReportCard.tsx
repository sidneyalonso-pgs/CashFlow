import { COMPONENTES, type CompKey } from "@/lib/calculations/centralPiloto";

export type ReportData = {
  /** data de apuração: o dia em que o dinheiro caiu na conta */
  apuracao: string;
  linhas: Array<{ referencia: string; valores: Record<CompKey, number>; total: number }>;
  totais: Record<CompKey, number>;
  total: number;
  bankLabel: string | null;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaDaSemana(iso: string) {
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return dias[new Date(iso + "T00:00:00Z").getUTCDay()];
}

function Tile({ label, value, destaque = false }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className="bg-white rounded-ps-sm border border-ps-navy/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-ps-muted font-semibold mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums ${destaque ? "text-ps-green-700" : "text-ps-ink"}`}>{value}</p>
    </div>
  );
}

export function ReportCard({ data }: { data: ReportData }) {
  const referencias = data.linhas.map((l) => l.referencia);
  const refTexto =
    referencias.length === 0 ? "—" : referencias.length === 1 ? dataBR(referencias[0]) : `${dataBR(referencias[0])} a ${dataBR(referencias[referencias.length - 1])}`;

  return (
    <div className="doc-navy bg-ps-bg rounded-ps overflow-hidden max-w-3xl mx-auto" id="apuracao-receitas-report">
      {/* Cabeçalho */}
      <div className="bg-ps-navy px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="h-7" />
          <div className="h-7 w-px bg-white/20" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">APURAÇÃO DE RECEITAS</p>
            <p className="text-white/50 text-[11px] font-mono uppercase tracking-wider">Pagsmile IP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-[10px] uppercase tracking-wide">Data de apuração</p>
          <p className="text-white font-bold text-lg tabular-nums">{dataBR(data.apuracao)}</p>
          <p className="text-ps-green-300 text-[11px] capitalize">{diaDaSemana(data.apuracao)}</p>
        </div>
      </div>

      <div className="px-6 py-4 flex items-center justify-between border-b border-ps-navy/5 bg-ps-green-200/40">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ps-muted font-semibold mb-0.5">Data de referência</p>
          <p className="text-sm font-semibold text-ps-ink tabular-nums">{refTexto}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-ps-muted font-semibold mb-0.5">Total apurado</p>
          <p className="text-3xl font-extrabold tabular-nums text-ps-green-700">{fmt(data.total)}</p>
        </div>
      </div>

      {data.linhas.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-ps-muted">Nenhuma apuração lançada para esta data.</p>
        </div>
      ) : (
        <div className="p-6 space-y-5">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ps-muted mb-2">
              Receitas apuradas {data.bankLabel && <span className="normal-case font-normal text-ps-muted/80">· {data.bankLabel}</span>}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COMPONENTES.map((c) => (
                <Tile key={c.key} label={c.label} value={fmt(data.totais[c.key])} destaque />
              ))}
              <Tile label="Total apurado" value={fmt(data.total)} />
            </div>
          </section>

          {data.linhas.length > 1 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ps-muted mb-2">Por data de referência</h3>
              <div className="bg-white rounded-ps-sm border border-ps-navy/5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-ps-muted">
                      <th className="px-3 py-2">Referência</th>
                      {COMPONENTES.map((c) => (
                        <th key={c.key} className="px-3 py-2 text-right">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.linhas.map((l) => (
                      <tr key={l.referencia} className="border-t border-ps-navy/5">
                        <td className="px-3 py-2 tabular-nums">{dataBR(l.referencia)}</td>
                        {COMPONENTES.map((c) => (
                          <td key={c.key} className="px-3 py-2 text-right tabular-nums">
                            {fmt(l.valores[c.key])}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      <div className="px-6 pb-5">
        <p className="text-[10px] text-ps-muted">Gerado pela Central Piloto — Treasury PagSmile.</p>
      </div>
    </div>
  );
}

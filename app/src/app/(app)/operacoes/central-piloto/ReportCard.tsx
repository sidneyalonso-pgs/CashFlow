export type ReportData = {
  data: string;
  saldoEmConta: number | null;
  fee: number | null;
  remuneracaoSpi: number | null;
  remuneracaoCcme: number | null;
  bankLabel: string | null;
  saldoAdmin: number | null;
  valorAplicadoSalvaGuarda: number | null;
  saldo4111: number | null;
  gap: number | null;
  taxaCcme: number;
  retiradas: number | null;
  deixarNaCcme: number | null;
};

function fmt(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(n: number | null, casas = 2) {
  if (n == null) return "—";
  return `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function dataBRLonga(iso: string) {
  const [a, m, d] = iso.split("-");
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const dia = dias[new Date(iso + "T00:00:00Z").getUTCDay()];
  return { curta: `${d}/${m}/${a}`, extenso: dia };
}

function Tile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "red" }) {
  const toneClass = tone === "green" ? "text-ps-green-700" : tone === "red" ? "text-red-600" : "text-ps-ink";
  return (
    <div className="bg-white rounded-ps-sm border border-ps-navy/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-ps-muted font-semibold mb-1">{label}</p>
      <p className={`text-base font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function ReportCard({ data }: { data: ReportData }) {
  const { curta, extenso } = dataBRLonga(data.data);
  const gapOk = data.gap != null && data.gap >= 1;

  return (
    <div className="bg-ps-bg rounded-ps overflow-hidden max-w-3xl mx-auto" id="salva-guarda-report">
      {/* Cabeçalho */}
      <div className="bg-ps-navy px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/pagsmile-logo-transparent.png" alt="PagSmile" className="h-7" />
          <div className="h-7 w-px bg-white/20" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">SALVA-GUARDA PAGSMILE IP</p>
            <p className="text-white/50 text-[11px] font-mono uppercase tracking-wider">Relatório diário</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-lg tabular-nums">{curta}</p>
          <p className="text-ps-green-300 text-[11px] capitalize">{extenso}</p>
        </div>
      </div>

      {/* GAP em destaque */}
      <div className={`px-6 py-4 flex items-center justify-between border-b border-ps-navy/5 ${gapOk ? "bg-ps-green-200/40" : "bg-amber-50"}`}>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ps-muted font-semibold mb-0.5">GAP 4111 — Salva-Guarda</p>
          <p className="text-xs text-ps-muted">Aplicado Salva-Guarda + Deixar na CCME ÷ Saldo 4111</p>
        </div>
        <p className={`text-3xl font-extrabold tabular-nums ${gapOk ? "text-ps-green-700" : "text-amber-700"}`}>
          {fmtPct(data.gap)}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ps-muted mb-2">Movimento do dia</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile label="Saldo em conta" value={fmt(data.saldoEmConta)} />
            <Tile label="Retiradas" value={fmt(data.retiradas)} tone={data.retiradas ? "red" : "neutral"} />
            <Tile label="Saldo Admin (SPB)" value={fmt(data.saldoAdmin)} />
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ps-muted mb-2">
            Receitas do dia {data.bankLabel && <span className="normal-case font-normal text-ps-muted/80">· {data.bankLabel}</span>}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile label="Fee" value={fmt(data.fee)} tone="green" />
            <Tile label="Remuneração SPI" value={fmt(data.remuneracaoSpi)} tone="green" />
            <Tile label="Remuneração CCME" value={fmt(data.remuneracaoCcme)} tone="green" />
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ps-muted mb-2">Salva-Guarda / CCME</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile label="Valor aplicado Salva-Guarda" value={fmt(data.valorAplicadoSalvaGuarda)} />
            <Tile label="Saldo 4111" value={fmt(data.saldo4111)} />
            <Tile label="Deixar na CCME" value={fmt(data.deixarNaCcme)} />
            <Tile label="Taxa CCME" value={fmtPct(data.taxaCcme, 2)} />
          </div>
        </section>
      </div>

      <div className="px-6 pb-5">
        <p className="text-[10px] text-ps-muted">Gerado pela Central Piloto — Treasury PagSmile.</p>
      </div>
    </div>
  );
}

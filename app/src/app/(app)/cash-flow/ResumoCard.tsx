type Tom = "neutro" | "entrada" | "saida";
type Icone = "saldo" | "entrada" | "saida" | "carteira";

const ICONES: Record<Icone, string> = {
  saldo: "M12 3C7.6 3 4 4.3 4 6v3c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3ZM4 9v3c0 1.7 3.6 3 8 3s8-1.3 8-3V9M4 12v3c0 1.7 3.6 3 8 3s8-1.3 8-3v-3",
  entrada: "M7 17 17 7M9 7h8v8",
  saida: "M12 5v14M6 13l6 6 6-6",
  carteira: "M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h15a2 2 0 0 1 2 2v2h-4a2 2 0 0 0 0 4h4v-4",
};

const ESTILO: Record<Tom, { caixa: string; icone: string; valor: string }> = {
  neutro: { caixa: "bg-white border-ps-navy/10", icone: "bg-ps-navy-50 text-ps-navy", valor: "text-ps-ink" },
  entrada: { caixa: "bg-white border-emerald-200", icone: "bg-emerald-50 text-emerald-700", valor: "text-ps-green-700" },
  saida: { caixa: "bg-red-50/70 border-red-200", icone: "bg-red-100 text-red-600", valor: "text-red-600" },
};

/**
 * Cartão compacto do Cash Flow: ícone em quadrado à esquerda, rótulo pequeno e valor.
 * Largura própria (não estica com a linha) e uma altura só de rótulo + valor.
 */
export function ResumoCard({ label, value, tom = "neutro", icone }: { label: string; value: string; tom?: Tom; icone: Icone }) {
  const e = ESTILO[tom];
  return (
    <div className={`flex items-center gap-3.5 rounded-ps border shadow-ps-sm px-4 py-3.5 w-full sm:w-[280px] ${e.caixa}`}>
      <span className={`w-11 h-11 rounded-ps-sm flex items-center justify-center shrink-0 ${e.icone}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
          <path d={ICONES[icone]} />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-ps-muted font-medium leading-tight">{label}</p>
        <p className={`mt-1 text-[21px] font-bold tabular-nums leading-tight whitespace-nowrap ${e.valor}`}>{value}</p>
      </div>
    </div>
  );
}

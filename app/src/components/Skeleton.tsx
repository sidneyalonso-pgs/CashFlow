/**
 * Esqueleto de carregamento. Existe porque as telas de Cash Flow e Posição Executiva puxam
 * todos os lançamentos sem corte de data — enquanto carregam, antes não acontecia nada na tela
 * e não havia como saber se o filtro tinha sido aplicado.
 */

function Barra({ className = "" }: { className?: string }) {
  return <div className={`bg-ps-navy/[0.07] rounded animate-pulse ${className}`} />;
}

export function CardsSkeleton({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5">
          <Barra className="h-2.5 w-2/3" />
          <Barra className="h-6 w-4/5 mt-3" />
        </div>
      ))}
    </div>
  );
}

export function TabelaSkeleton({ linhas = 6, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 overflow-hidden">
      <div className="bg-ps-bg-2 px-4 py-3 flex gap-4">
        {Array.from({ length: colunas }).map((_, i) => (
          <Barra key={i} className={`h-2.5 ${i === 0 ? "w-40" : "flex-1"}`} />
        ))}
      </div>
      {Array.from({ length: linhas }).map((_, l) => (
        <div key={l} className="px-4 py-3.5 flex gap-4 border-t border-ps-navy/5">
          {Array.from({ length: colunas }).map((_, c) => (
            <Barra key={c} className={`h-3 ${c === 0 ? "w-40" : "flex-1"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Cabeçalho + cartões + tabela: o formato da maioria das telas do sistema. */
export function PaginaSkeleton({ cards = 4, colunas = 5 }: { cards?: number; colunas?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="mb-6 pb-5 border-b border-ps-navy/[0.06] flex items-start gap-3">
        <span className="mt-1.5 w-1 h-6 rounded-full bg-ps-green/40 shrink-0" />
        <div className="flex-1">
          <Barra className="h-6 w-72" />
          <Barra className="h-3 w-96 mt-2.5" />
        </div>
      </div>
      <div className="space-y-6">
        <CardsSkeleton quantidade={cards} />
        <TabelaSkeleton colunas={colunas} />
      </div>
    </div>
  );
}

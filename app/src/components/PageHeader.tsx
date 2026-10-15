import { BackLink } from "./BackLink";

/** Destaca a última palavra do título em menta (padrão da intranet). */
function Titulo({ texto }: { texto: string }) {
  const i = texto.lastIndexOf(" ");
  if (i < 0) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i + 1)}
      <span className="text-ps-mint font-medium print:text-ps-ink">{texto.slice(i + 1)}</span>
    </>
  );
}

// Botões do cabeçalho viram contorno translúcido sobre o verde, qualquer que seja o estilo de origem
const ACOES_NO_VERDE =
  "flex items-center gap-2 [&_a]:!bg-white/10 [&_a]:!text-white [&_a]:!border [&_a]:!border-white/30 [&_a]:!rounded-full [&_a:hover]:!bg-white/20 " +
  "[&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!border [&_button]:!border-white/30 [&_button]:!rounded-full [&_button:hover]:!bg-white/20";

/**
 * Cabeçalho da página dentro da faixa verde. Sobe até a faixa do topo (a Topbar) cancelando o
 * padding do <main>, e termina com a borda arredondada do conteúdo claro.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="-mx-8 -mt-8 mb-2 bg-ps-navy print:bg-transparent print:mx-0 print:mt-0">
      <div className="flex items-end justify-between gap-6 flex-wrap px-8 pt-6 pb-3 min-h-[132px]">
        <div>
          {/* deriva o destino do endereço: tela interna nova já nasce com saída */}
          <BackLink />
          <h1 className="text-2xl font-light tracking-tight text-white print:text-ps-ink">
            <Titulo texto={title} />
          </h1>
          {subtitle && <p className="text-sm text-white/70 mt-1 print:text-ps-muted">{subtitle}</p>}
        </div>
        {/* mt-14: reserva a altura do usuário (canto superior direito) para os botões nunca ficarem por baixo dele */}
        {actions && <div className={`${ACOES_NO_VERDE} mt-14 print:hidden print:mt-0`}>{actions}</div>}
      </div>
      <div className="h-4 bg-ps-bg rounded-tl-[24px] print:hidden" />
    </div>
  );
}

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

/**
 * Cabeçalho da página dentro da faixa verde. Sobe até a faixa do topo (a Topbar) cancelando o
 * padding do <main>, e termina com a borda arredondada do conteúdo claro.
 * As ações (botões/links) ficam na parte clara, logo abaixo da curva, alinhadas à direita,
 * com o estilo original de cada botão — a faixa verde fica só com título e subtítulo.
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
    <>
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
        </div>
        <div className="h-4 bg-ps-bg rounded-tl-[24px] print:hidden" />
      </div>
      {actions && <div className="flex items-center justify-end gap-2 flex-wrap mb-4 print:hidden">{actions}</div>}
    </>
  );
}

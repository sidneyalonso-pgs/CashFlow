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

// Todos os botões do cabeçalho seguem o mesmo formato (pílula), qualquer que seja o estilo de origem
export const ACOES_PILULA = "[&_a]:!rounded-full [&_button]:!rounded-full";

/**
 * Cabeçalho da página dentro da faixa verde. Sobe até a faixa do topo (a Topbar) cancelando o
 * padding do <main>, e termina com a borda arredondada do conteúdo claro.
 *
 * Alinhamento: o título fica na mesma linha (y = 66px) da logo do menu e do usuário (Topbar).
 * O "voltar" e o subtítulo são posicionados em volta do título sem empurrá-lo.
 *
 * As ações (botões/links) ficam na parte clara, logo abaixo da curva, alinhadas à direita, com o
 * estilo original de cada botão. Telas com filtros usam o <Toolbar> para pôr filtros e ações na
 * mesma linha — nesse caso não passam `actions` aqui.
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
        <div className="relative px-8 pt-[50px] pb-3 min-h-[132px] print:min-h-0 print:pt-0">
          <div className="relative">
            {/* deriva o destino do endereço: tela interna nova já nasce com saída */}
            <div className="absolute bottom-full left-0 print:hidden">
              <BackLink />
            </div>
            <h1 className="text-2xl font-light tracking-tight text-white print:text-ps-ink">
              <Titulo texto={title} />
            </h1>
            {subtitle && (
              <p className="absolute left-0 top-full mt-0.5 w-[min(60ch,70vw)] text-sm text-white/70 print:static print:w-auto print:text-ps-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="h-4 bg-ps-bg rounded-tl-[24px] print:hidden" />
      </div>
      {actions && (
        <div className={`flex items-center justify-end gap-2 flex-wrap mb-4 print:hidden ${ACOES_PILULA}`}>{actions}</div>
      )}
    </>
  );
}

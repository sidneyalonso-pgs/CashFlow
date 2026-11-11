import { ACOES_PILULA } from "./PageHeader";

/**
 * Linha única de filtros (esquerda) e ações da página (direita). Os filtros ocupam o espaço que
 * sobra e quebram de linha sozinhos; as ações ficam coladas à direita, no topo da linha, alinhadas
 * com o primeiro campo. Em telas estreitas as ações descem para baixo dos filtros.
 */
export function Toolbar({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-x-6 gap-y-3 flex-wrap mb-4">
      {/* o espaçamento de baixo passa a ser da linha inteira, não do formulário */}
      {/* basis de 40rem: se filtros + ações não couberem na linha, as ações descem inteiras (à direita)
          em vez de espremer os filtros numa coluna só */}
      <div className="min-w-0 flex-1 basis-[40rem] [&_form]:!mb-0">{children}</div>
      {actions && (
        // min-h de 40px = altura dos campos de filtro, para os botões ficarem centrados na mesma linha
        <div className={`flex items-center gap-2 flex-wrap ml-auto min-h-[40px] print:hidden ${ACOES_PILULA}`}>{actions}</div>
      )}
    </div>
  );
}

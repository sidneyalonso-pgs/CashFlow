import Link from "next/link";

export const PAGE_SIZE = 50;

/** Lê o número da página da URL (mínimo 1). */
export function parsePage(raw?: string): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Intervalo (inclusivo) de linhas para o .range() do Supabase. */
export function pageRange(page: number, size = PAGE_SIZE): [number, number] {
  return [(page - 1) * size, page * size - 1];
}

/**
 * Barra de paginação das listagens: "1–50 de 1.234" + Anterior/Próxima.
 * Mantém os filtros e a ordenação da URL; só troca o número da página.
 */
export function Pagination({
  page,
  total,
  size = PAGE_SIZE,
  searchParams,
  noun,
}: {
  page: number;
  total: number;
  size?: number;
  searchParams: Record<string, string | undefined>;
  noun: string;
}) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const from = Math.min((page - 1) * size + 1, total);
  const to = Math.min(page * size, total);

  const href = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  const btn =
    "rounded-full border border-ps-navy/15 bg-white px-4 py-1.5 text-sm font-medium text-ps-ink hover:bg-ps-bg-2 transition-colors";
  const off = "rounded-full border border-ps-navy/10 px-4 py-1.5 text-sm text-ps-muted/50 cursor-not-allowed";

  return (
    <nav aria-label="Paginação" className="mt-3 flex items-center justify-between gap-3 flex-wrap print:hidden">
      <p className="text-sm text-ps-muted tabular-nums">
        {from.toLocaleString("pt-BR")}–{to.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} {noun}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={btn}>
              Anterior
            </Link>
          ) : (
            <span className={off}>Anterior</span>
          )}
          <span className="text-sm text-ps-muted tabular-nums px-1">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={href(page + 1)} className={btn}>
              Próxima
            </Link>
          ) : (
            <span className={off}>Próxima</span>
          )}
        </div>
      )}
    </nav>
  );
}

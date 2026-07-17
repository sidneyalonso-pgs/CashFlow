// Evita erros de digitação em campos de data nativos (ex: ano "2000" em vez de "2026"),
// que já causaram lançamentos "invisíveis" em qualquer relatório do ano corrente.

const MIN_YEAR_OFFSET = 3; // anos no passado
const MAX_YEAR_OFFSET = 3; // anos no futuro

export function assertReasonableDate(iso: string, fieldLabel: string): string | null {
  if (!iso) return `${fieldLabel} é obrigatória.`;

  const year = Number(iso.slice(0, 4));
  const currentYear = new Date().getUTCFullYear();

  if (!year || Number.isNaN(year)) return `${fieldLabel} inválida.`;
  if (year < currentYear - MIN_YEAR_OFFSET || year > currentYear + MAX_YEAR_OFFSET) {
    return `${fieldLabel} parece incorreta (ano ${year}). Confira se não houve erro de digitação.`;
  }
  return null;
}

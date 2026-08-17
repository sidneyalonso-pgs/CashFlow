export const TRANSFER_INFLOW_TIPOS = ["pix_recebido", "ted_recebido"];
export const TRANSFER_OUTFLOW_TIPOS = ["pix_enviado", "ted_enviado", "debito_bancario", "reembolso"];

type TransferRow = {
  tipo: string;
  company_id?: string | null;
  from_account_id?: string | null;
  to_account_id?: string | null;
};

/**
 * Direção de uma transferência em relação a um escopo (empresa e/ou conta bancária).
 *
 * Quem manda é a conta bancária: o dinheiro sai se a conta de origem está no escopo e entra se
 * a de destino está. O tipo do lançamento só decide quando aquela ponta não é uma conta
 * cadastrada (contraparte externa). Assim uma transferência entre empresas do grupo aparece como
 * saída de um lado e entrada do outro, e uma transferência interna da mesma empresa se anula
 * quando se olha a empresa inteira, mas continua visível conta a conta.
 */
export function transferDirection(scopeAccountIds: Set<string>, companyId?: string) {
  const inScope = (accountId?: string | null) => !!accountId && scopeAccountIds.has(accountId);
  const ownedByScope = (t: TransferRow) => !companyId || t.company_id === companyId;
  return {
    isOutflow: (t: TransferRow) =>
      inScope(t.from_account_id) ||
      (!t.from_account_id && TRANSFER_OUTFLOW_TIPOS.includes(t.tipo) && ownedByScope(t)),
    isInflow: (t: TransferRow) =>
      inScope(t.to_account_id) ||
      (!t.to_account_id && TRANSFER_INFLOW_TIPOS.includes(t.tipo) && ownedByScope(t)),
  };
}

/** Ids das contas que compõem o escopo: uma conta específica, ou todas as da empresa. */
export function scopeAccounts(bankAccountId: string | undefined, accounts: { id: string }[]) {
  return new Set<string>(bankAccountId ? [bankAccountId] : accounts.map((a) => a.id));
}

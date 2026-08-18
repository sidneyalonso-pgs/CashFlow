/**
 * Eliminação de movimento entre empresas do grupo no consolidado.
 *
 * As duas pernas do mesmo movimento carregam o mesmo intercompany_ref. Quando as duas estão
 * dentro do escopo olhado, nenhuma delas entra no bruto: o grupo não ganhou nem perdeu nada,
 * mostrar R$ X entrando e R$ X saindo só infla os dois totais.
 *
 * O saldo não muda com isso. Sai uma entrada de X e uma saída de X, e a diferença entre
 * entradas e saídas — que é o que forma o saldo — continua a mesma.
 *
 * Quando só uma perna está no escopo (filtro por uma empresa), o movimento é saída ou entrada
 * de verdade daquele escopo e continua aparecendo. É o que a visão individual precisa mostrar.
 */

export type Leg = {
  tabela: "transfers" | "revenues" | "payments";
  id: string;
  ref: string | null;
  companyId: string | null;
};

export type Eliminacao = {
  /** ids a ignorar, por tabela */
  ignorar: Record<Leg["tabela"], Set<string>>;
  /** quantos movimentos foram eliminados, para a tela poder informar */
  movimentos: number;
};

export function eliminarIntercompany(legs: Leg[], escopo: Set<string>): Eliminacao {
  const porRef = new Map<string, Leg[]>();
  for (const l of legs) {
    if (!l.ref || !l.companyId || !escopo.has(l.companyId)) continue;
    const atual = porRef.get(l.ref) ?? [];
    atual.push(l);
    porRef.set(l.ref, atual);
  }

  const ignorar: Eliminacao["ignorar"] = {
    transfers: new Set<string>(),
    revenues: new Set<string>(),
    payments: new Set<string>(),
  };
  let movimentos = 0;

  for (const pernas of porRef.values()) {
    // precisa de pelo menos duas empresas diferentes dentro do escopo: com uma só, o dinheiro
    // de fato entrou ou saiu do escopo e a perna tem de continuar contando
    const empresas = new Set(pernas.map((p) => p.companyId));
    if (empresas.size < 2) continue;
    movimentos++;
    for (const p of pernas) ignorar[p.tabela].add(p.id);
  }

  return { ignorar, movimentos };
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Volta um nível na navegação, derivado do endereço atual.
 *
 * Fica aqui e não em cada tela porque a maioria das telas internas não tinha saída nenhuma —
 * quem entrava em Cadastros > Fornecedores só voltava pelo botão do navegador. Derivando do
 * caminho, tela nova nasce com o voltar funcionando, sem ninguém ter de lembrar.
 */

/** Rótulo do destino. Sem entrada aqui, o segmento é usado como está. */
const ROTULOS: Record<string, string> = {
  "/": "Visão geral",
  "/cadastros": "Cadastros",
  "/cash-flow": "Cash Flow",
  "/conciliacao": "Conciliação",
  "/configuracoes": "Configurações",
  "/faturamento": "Faturamento",
  "/faturamento/notas-debito": "Notas de débito",
  "/pagamentos": "Pagamentos",
  "/pagamentos/recorrentes": "Pagamentos recorrentes",
  "/receitas": "Receitas",
  "/transferencias": "Transferências",
  "/investimentos": "Investimentos",
  "/movimentacoes": "Extrato geral",
  "/fpa": "FP&A",
  "/relatorios": "Relatórios",
};

function humanizar(segmento: string) {
  return segmento
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function BackLink() {
  const pathname = usePathname();
  if (!pathname) return null;

  const partes = pathname.split("/").filter(Boolean);
  if (partes.length === 0) return null; // já está na raiz

  const destino = "/" + partes.slice(0, -1).join("/");
  const rotulo = ROTULOS[destino] ?? humanizar(partes[partes.length - 2] ?? "");

  return (
    <Link
      href={destino}
      className="inline-flex items-center gap-1.5 text-xs text-ps-muted hover:text-ps-navy transition-colors mb-1.5 print:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-navy/30 rounded"
    >
      <span aria-hidden="true">←</span>
      {rotulo}
    </Link>
  );
}

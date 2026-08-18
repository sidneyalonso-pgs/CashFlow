"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Uma tela com erro deixa de derrubar o app inteiro. Antes disso, uma exceção no servidor
 * mostrava só "Application error" com um número de digest e a página em branco — sem dizer o
 * que fazer nem oferecer volta.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // vai para os logs do servidor, onde dá para cruzar com o digest mostrado abaixo
    console.error("Erro ao renderizar a tela:", error);
  }, [error]);

  return (
    <div className="max-w-xl">
      <div className="bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 border-l-4 border-l-red-500 p-6">
        <h1 className="text-lg font-bold text-ps-ink">Esta tela não conseguiu carregar</h1>
        <p className="text-sm text-ps-muted mt-2 leading-relaxed">
          O resto do sistema continua funcionando — o problema é só aqui. Costuma ser um lançamento
          incompleto ou uma consulta que falhou. Tentar de novo resolve na maioria dos casos.
        </p>

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={reset}
            className="bg-ps-navy text-white text-sm font-semibold rounded-ps-sm px-4 py-2 hover:bg-ps-navy-700 transition-colors"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors"
          >
            Ir para a Visão geral
          </Link>
        </div>

        {error.digest && (
          <p className="mt-5 pt-4 border-t border-ps-navy/5 text-xs text-ps-muted-2">
            Se continuar, informe este código ao suporte:{" "}
            <code className="font-mono bg-ps-bg-2 px-1.5 py-0.5 rounded text-ps-muted">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}

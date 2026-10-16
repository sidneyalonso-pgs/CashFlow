"use client";

import { createPortal } from "react-dom";

/**
 * Renderiza o conteúdo fora de onde o componente foi chamado, dentro do .app-shell.
 *
 * Motivo: modais abertos por botões do cabeçalho da página ficavam DENTRO da caixa de ações do
 * PageHeader, e os estilos que deixam aqueles botões legíveis sobre o verde (texto branco,
 * fundo translúcido) alcançavam também os botões "Salvar"/"Cancelar" do modal, que ficavam
 * brancos sobre branco. Fora dessa caixa nenhum estilo do cabeçalho chega ao modal. Dentro do
 * .app-shell para manter as cores e a fonte do tema.
 *
 * Só serve para conteúdo que aparece depois de uma ação do usuário (nunca é renderizado no
 * servidor); no servidor devolve nada.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  const alvo = document.querySelector(".app-shell") ?? document.body;
  return createPortal(children, alvo);
}

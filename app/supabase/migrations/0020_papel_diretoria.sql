-- Papel "diretoria": acesso somente à Posição Executiva de Recursos.
--
-- Não precisa de nenhuma política nova. As policies de escrita já listam quem pode gravar
-- (payments_insert exige 'administrador' ou 'tesouraria', payments_update aceita também
-- 'aprovador', e assim por diante); como 'diretoria' não aparece em nenhuma dessas listas,
-- a escrita fica negada por padrão, no banco, independentemente do que a interface mostre.
--
-- A leitura continua governada por has_company_access(), que libera para administrador ou
-- para quem tiver acesso explícito à empresa. Por isso, depois de aplicar isto, cada diretor
-- precisa receber acesso às empresas em Configurações > Usuários — sem isso a dashboard abre
-- zerada, porque a tabela user_company_access hoje está vazia.
--
-- ATENÇÃO ao rodar: ALTER TYPE ... ADD VALUE não pode ser usado na mesma transação em que o
-- novo valor é referenciado. Rode este arquivo sozinho, sem juntar com outros comandos.

alter type user_role add value if not exists 'diretoria';

-- login_attempts ficou sem RLS desde a criação (migration 0013) — Supabase alertou que a tabela
-- estava publicamente acessível (qualquer um com a URL do projeto podia ler/editar/apagar).
--
-- É seguro travar sem nenhuma policy: todo acesso a essa tabela no código (app/src/app/login/
-- actions.ts) já usa o client de service role, que ignora RLS por padrão. Nenhuma policy é
-- necessária — com RLS ligado e zero policies, anon/authenticated ficam sem nenhum acesso.

alter table login_attempts enable row level security;

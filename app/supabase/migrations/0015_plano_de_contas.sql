-- Plano de Contas: mapeia fornecedores, contas bancarias e categorias de receita
-- a codigos contabeis, para gerar o relatorio De-Para Contabil.
--
-- Direcao debito/credito nao e armazenada: e derivada no relatorio pelo tipo de
-- lancamento (pagamento = credito no banco + debito no fornecedor; receita =
-- debito no banco + credito na categoria).
--
-- payments.chart_account_id e revenues.chart_account_id sao um SNAPSHOT tirado
-- do fornecedor/categoria no momento do lancamento (mesmo padrao ja usado para
-- cost_type/cost_structure) - se a conta contabil do fornecedor mudar depois,
-- lancamentos ja criados NAO sao retroativamente atualizados.

create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table suppliers add column chart_account_id uuid references chart_of_accounts(id);
alter table bank_accounts add column chart_account_id uuid references chart_of_accounts(id);
alter table categories add column chart_account_id uuid references chart_of_accounts(id);
alter table payments add column chart_account_id uuid references chart_of_accounts(id);
alter table revenues add column chart_account_id uuid references chart_of_accounts(id);

alter table chart_of_accounts enable row level security;

create policy "chart_of_accounts_select" on chart_of_accounts for select using (auth.uid() is not null);
create policy "chart_of_accounts_insert" on chart_of_accounts for insert with check (current_user_role() = 'administrador');
create policy "chart_of_accounts_update" on chart_of_accounts for update using (current_user_role() = 'administrador');
create policy "chart_of_accounts_delete" on chart_of_accounts for delete using (current_user_role() = 'administrador');

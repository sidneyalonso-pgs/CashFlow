-- Central Piloto: tabelão diário da Salva-Guarda (conta PI — saldo próprio + de todos os
-- clientes). Rodar DEPOIS de 0022_papel_piloto.sql já ter sido aplicada e commitada (o valor
-- 'piloto' do enum precisa existir antes de ser referenciado nas policies abaixo).
--
-- Colunas manuais: saldo_em_conta, fee, remuneracao_spi, remuneracao_ccme, saldo_4111,
-- taxa_ccme, retiradas, deixar_na_ccme — cada uma com o banco escolhido para fee/spi/ccme,
-- que geram receita automaticamente (ver app/src/app/(app)/operacoes/central-piloto/actions.ts).
--
-- Colunas calculadas no app (não guardadas aqui): saldo_admin (lido ao vivo da conta
-- "Administrativo - SPB"), valor_aplicado_salva_guarda (= saldo_em_conta - 80000),
-- gap_4111_salva_guarda (= (valor_aplicado + deixar_na_ccme) / saldo_4111).

create table salva_guarda_diario (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  data date not null,

  saldo_em_conta numeric,
  fee numeric,
  fee_bank_account_id uuid references bank_accounts(id),
  fee_revenue_id uuid references revenues(id),
  remuneracao_spi numeric,
  remuneracao_spi_bank_account_id uuid references bank_accounts(id),
  remuneracao_spi_revenue_id uuid references revenues(id),
  remuneracao_ccme numeric,
  remuneracao_ccme_bank_account_id uuid references bank_accounts(id),
  remuneracao_ccme_revenue_id uuid references revenues(id),
  saldo_4111 numeric,
  taxa_ccme numeric not null default 0.0005,
  retiradas numeric,
  deixar_na_ccme numeric,

  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, data)
);

create trigger trg_salva_guarda_diario_updated
  before update on salva_guarda_diario
  for each row execute function set_updated_at();

alter table salva_guarda_diario enable row level security;

create policy "salva_guarda_diario_select" on salva_guarda_diario
  for select using (
    has_company_access(company_id) or current_user_role() = 'piloto'
  );

create policy "salva_guarda_diario_insert" on salva_guarda_diario
  for insert with check (
    current_user_role() in ('administrador', 'tesouraria', 'piloto')
  );

create policy "salva_guarda_diario_update" on salva_guarda_diario
  for update using (
    current_user_role() in ('administrador', 'tesouraria', 'piloto')
  );

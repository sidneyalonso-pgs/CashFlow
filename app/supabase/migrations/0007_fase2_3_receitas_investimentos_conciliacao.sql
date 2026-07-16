-- PagSmile Treasury — Fase 2/3: receitas, investimentos, extrato bancário e conciliação

create type revenue_status as enum (
  'estimada', 'confirmada', 'parcialmente_recebida', 'recebida', 'atrasada', 'reprogramada', 'cancelada'
);

create type investment_status as enum ('ativo', 'resgatado', 'parcialmente_resgatado');

create type reconciliation_status as enum (
  'pendente', 'sugestao_encontrada', 'conciliado_automaticamente', 'conciliado_manualmente', 'divergente', 'ignorado'
);

-- ============================================================
-- revenues / revenue_realizations
-- ============================================================
create table revenues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid references customers(id),
  description text not null,
  expected_amount numeric(18,2) not null,
  realized_amount numeric(18,2),
  currency text not null default 'BRL',
  category_id uuid references categories(id),
  expected_date date not null,
  realized_date date,
  probability_pct numeric(5,2) not null default 100 check (probability_pct between 0 and 100),
  weighted_amount numeric(18,2) generated always as (expected_amount * probability_pct / 100) stored,
  receiving_bank_account_id uuid references bank_accounts(id),
  fpa_classification text,
  status revenue_status not null default 'estimada',
  reconciliation_status reconciliation_status not null default 'pendente',
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_revenues_updated before update on revenues
  for each row execute function set_updated_at();
create trigger trg_audit_revenues after insert or update on revenues
  for each row execute function log_audit_event();

create table revenue_realizations (
  id uuid primary key default gen_random_uuid(),
  revenue_id uuid not null references revenues(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  received_at date not null,
  bank_account_id uuid references bank_accounts(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- investments
-- ============================================================
create table investments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  bank_account_id uuid references bank_accounts(id),
  institution text not null,
  product text not null,
  applied_amount numeric(18,2) not null,
  applied_date date not null,
  due_date date,
  liquidity text,
  rate text,
  indexer text,
  redeemed_amount numeric(18,2) not null default 0,
  redeemed_date date,
  status investment_status not null default 'ativo',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_investments_updated before update on investments
  for each row execute function set_updated_at();
create trigger trg_audit_investments after insert or update on investments
  for each row execute function log_audit_event();

-- ============================================================
-- bank_statement_imports / bank_statement_entries
-- ============================================================
create table bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  bank_account_id uuid not null references bank_accounts(id),
  file_name text not null,
  period_start date,
  period_end date,
  total_rows int not null default 0,
  imported_rows int not null default 0,
  user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table bank_statement_entries (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references bank_statement_imports(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id),
  entry_date date not null,
  bank_description text not null,
  amount numeric(18,2) not null,
  direction transaction_direction not null,
  bank_balance numeric(18,2),
  document_reference text,
  external_id text,
  reconciliation_status reconciliation_status not null default 'pendente',
  created_at timestamptz not null default now()
);

create index bank_statement_entries_account_idx on bank_statement_entries(bank_account_id, entry_date);

-- ============================================================
-- reconciliations
-- ============================================================
create table reconciliations (
  id uuid primary key default gen_random_uuid(),
  bank_statement_entry_id uuid not null references bank_statement_entries(id),
  entity_type text not null check (entity_type in ('payment', 'revenue')),
  entity_id uuid not null,
  matched_by uuid references profiles(id),
  match_type text not null default 'manual' check (match_type in ('manual', 'automatico')),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- payments/transactions ganham status de conciliação de verdade
-- ============================================================
alter table payments add column if not exists reconciliation_status reconciliation_status not null default 'pendente';

-- ============================================================
-- RLS
-- ============================================================
alter table revenues enable row level security;
alter table revenue_realizations enable row level security;
alter table investments enable row level security;
alter table bank_statement_imports enable row level security;
alter table bank_statement_entries enable row level security;
alter table reconciliations enable row level security;

create policy "revenues_select" on revenues for select using (has_company_access(company_id));
create policy "revenues_insert" on revenues for insert with check (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
);
create policy "revenues_update" on revenues for update using (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
);

create policy "revenue_realizations_select" on revenue_realizations for select using (
  exists (select 1 from revenues r where r.id = revenue_id and has_company_access(r.company_id))
);
create policy "revenue_realizations_insert" on revenue_realizations for insert with check (
  current_user_role() in ('administrador', 'tesouraria')
  and exists (select 1 from revenues r where r.id = revenue_id and has_company_access(r.company_id))
);

create policy "investments_select" on investments for select using (has_company_access(company_id));
create policy "investments_insert" on investments for insert with check (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
);
create policy "investments_update" on investments for update using (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
);

create policy "bank_statement_imports_select" on bank_statement_imports for select using (has_company_access(company_id));
create policy "bank_statement_imports_insert" on bank_statement_imports for insert with check (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);

create policy "bank_statement_entries_select" on bank_statement_entries for select using (
  exists (
    select 1 from bank_statement_imports i
    where i.id = import_id and has_company_access(i.company_id)
  )
);
create policy "bank_statement_entries_insert" on bank_statement_entries for insert with check (
  current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);
create policy "bank_statement_entries_update" on bank_statement_entries for update using (
  current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);

create policy "reconciliations_select" on reconciliations for select using (auth.uid() is not null);
create policy "reconciliations_insert" on reconciliations for insert with check (
  current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);
create policy "reconciliations_delete" on reconciliations for delete using (
  current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);

create policy "payments_update_reconciliation" on payments for update using (
  has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria', 'conciliacao')
);

-- PagSmile Treasury — Fase 1: cadastros, pagamentos, movimentações realizadas
-- Rodar no SQL Editor do projeto Supabase (Database > SQL Editor > New query).

-- ============================================================
-- Extensões
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum (
  'administrador', 'tesouraria', 'aprovador', 'conciliacao', 'fpa', 'visualizador'
);

create type entity_status as enum ('ativo', 'inativo');

create type bank_account_type as enum (
  'conta_corrente', 'conta_pagamento', 'conta_arrecadadora',
  'conta_garantia', 'conta_investimento', 'conta_restrita', 'outra'
);

create type payment_status as enum (
  'rascunho', 'pendente_aprovacao', 'aprovado', 'rejeitado',
  'agendado', 'pago_parcialmente', 'pago', 'vencido', 'cancelado'
);

create type payment_method as enum (
  'pix', 'ted', 'boleto', 'debito_automatico', 'cartao', 'transferencia_interna', 'outro'
);

create type transaction_direction as enum ('entrada', 'saida');

create type category_direction as enum ('entrada', 'saida', 'ambas');

create type approval_decision as enum ('aprovado', 'rejeitado', 'devolvido');

-- ============================================================
-- profiles (estende auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'visualizador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- companies
-- ============================================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  cnpj text not null unique,
  default_currency text not null default 'BRL',
  status entity_status not null default 'ativo',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- user_company_access
-- ============================================================
create table user_company_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

-- ============================================================
-- bank_accounts
-- ============================================================
create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  bank_name text not null,
  bank_code text,
  branch text,
  account_number text not null,
  nickname text,
  account_type bank_account_type not null default 'conta_corrente',
  currency text not null default 'BRL',
  initial_balance numeric(18,2) not null default 0,
  initial_balance_date date not null default current_date,
  counts_as_available_cash boolean not null default true,
  status entity_status not null default 'ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- suppliers
-- ============================================================
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  tax_id text not null,
  person_type text not null check (person_type in ('fisica', 'juridica')),
  trade_name text,
  default_category_id uuid,
  default_cost_center_id uuid,
  bank_name text,
  branch text,
  account_number text,
  pix_key text,
  email text,
  phone text,
  notes text,
  status entity_status not null default 'ativo',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- customers
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  company_id uuid references companies(id),
  default_revenue_type text,
  default_category_id uuid,
  status entity_status not null default 'ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- cost_centers
-- ============================================================
create table cost_centers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  company_id uuid not null references companies(id),
  responsible_area text,
  manager_name text,
  status entity_status not null default 'ativo',
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ============================================================
-- projects
-- ============================================================
create table projects (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  company_id uuid not null references companies(id),
  cost_center_id uuid references cost_centers(id),
  responsible_name text,
  start_date date,
  end_date date,
  status entity_status not null default 'ativo',
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

-- ============================================================
-- categories / subcategories
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  allowed_direction category_direction not null default 'ambas',
  financial_nature text,
  economic_classification text,
  fpa_classification text,
  status entity_status not null default 'ativo',
  created_at timestamptz not null default now()
);

create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  status entity_status not null default 'ativo',
  created_at timestamptz not null default now()
);

alter table suppliers add constraint suppliers_default_category_fk
  foreign key (default_category_id) references categories(id);
alter table suppliers add constraint suppliers_default_cost_center_fk
  foreign key (default_cost_center_id) references cost_centers(id);
alter table customers add constraint customers_default_category_fk
  foreign key (default_category_id) references categories(id);

-- ============================================================
-- payments
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  supplier_id uuid not null references suppliers(id),
  description text not null,
  gross_amount numeric(18,2) not null,
  currency text not null default 'BRL',
  document_date date not null,
  due_date date not null,
  expected_payment_date date not null,
  competence_date date not null,
  category_id uuid not null references categories(id),
  subcategory_id uuid references subcategories(id),
  cost_center_id uuid references cost_centers(id),
  project_id uuid references projects(id),
  document_number text not null,
  financial_nature text,
  economic_classification text,
  fpa_classification text,
  fixed_variable text,
  recurring boolean not null default false,
  order_number text,
  contract_number text,
  payment_method payment_method,
  paying_bank_account_id uuid references bank_accounts(id),
  effective_payment_date date,
  paid_amount numeric(18,2),
  interest numeric(18,2) not null default 0,
  fine numeric(18,2) not null default 0,
  discount numeric(18,2) not null default 0,
  withheld_tax numeric(18,2) not null default 0,
  net_amount numeric(18,2) generated always as
    (gross_amount + interest + fine - discount - withheld_tax) stored,
  counterparty text,
  bank_reference text,
  notes text,
  status payment_status not null default 'rascunho',
  approver_id uuid references profiles(id),
  approved_at timestamptz,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index payments_company_idx on payments(company_id);
create index payments_status_idx on payments(status);
create index payments_due_date_idx on payments(due_date);

-- ============================================================
-- payment_realizations (pagamentos parciais)
-- ============================================================
create table payment_realizations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  paid_at date not null,
  bank_account_id uuid references bank_accounts(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index payment_realizations_payment_idx on payment_realizations(payment_id);

-- ============================================================
-- attachments
-- ============================================================
create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  original_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index attachments_entity_idx on attachments(entity_type, entity_id);

-- ============================================================
-- approvals
-- ============================================================
create table approvals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  approver_id uuid not null references profiles(id),
  decision approval_decision not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- transactions (visão consolidada realizada/prevista)
-- ============================================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  bank_account_id uuid references bank_accounts(id),
  direction transaction_direction not null,
  temporal_status text not null default 'prevista',
  financial_nature text,
  economic_classification text,
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  cost_center_id uuid references cost_centers(id),
  project_id uuid references projects(id),
  counterparty_type text,
  counterparty_id uuid,
  description text not null,
  document_number text,
  competence_date date,
  expected_date date,
  realized_date date,
  expected_amount numeric(18,2),
  realized_amount numeric(18,2),
  currency text not null default 'BRL',
  reconciliation_status text not null default 'pendente',
  source_type text not null,
  source_id uuid,
  transfer_group_id uuid,
  intercompany_group_id uuid,
  recurring boolean not null default false,
  fixed_variable text,
  fpa_classification text,
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index transactions_company_idx on transactions(company_id);
create index transactions_source_idx on transactions(source_type, source_id);

-- ============================================================
-- import_batches / import_errors
-- ============================================================
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  file_name text not null,
  user_id uuid references profiles(id),
  total_rows int not null default 0,
  valid_rows int not null default 0,
  rejected_rows int not null default 0,
  duplicate_rows int not null default 0,
  imported_rows int not null default 0,
  status text not null default 'processando',
  created_at timestamptz not null default now()
);

create table import_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  row_number int not null,
  field_name text,
  error_message text not null,
  raw_data jsonb
);

-- ============================================================
-- audit_logs
-- ============================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  source text,
  justification text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);

-- ============================================================
-- Trigger genérico de updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_companies_updated before update on companies
  for each row execute function set_updated_at();
create trigger trg_bank_accounts_updated before update on bank_accounts
  for each row execute function set_updated_at();
create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();
create trigger trg_payments_updated before update on payments
  for each row execute function set_updated_at();
create trigger trg_transactions_updated before update on transactions
  for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ============================================================
-- Novo usuário do Supabase Auth => cria profile automaticamente
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'visualizador');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

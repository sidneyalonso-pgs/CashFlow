-- PagSmile Treasury — Fase 1: Row Level Security
-- Rodar depois de 0001_fase1_schema.sql

-- ============================================================
-- Helpers
-- ============================================================
create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function has_company_access(target_company_id uuid)
returns boolean as $$
  select
    current_user_role() = 'administrador'
    or exists (
      select 1 from user_company_access
      where user_id = auth.uid() and company_id = target_company_id
    );
$$ language sql stable security definer;

-- ============================================================
-- Ativar RLS
-- ============================================================
alter table profiles enable row level security;
alter table companies enable row level security;
alter table user_company_access enable row level security;
alter table bank_accounts enable row level security;
alter table suppliers enable row level security;
alter table customers enable row level security;
alter table cost_centers enable row level security;
alter table projects enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table payments enable row level security;
alter table payment_realizations enable row level security;
alter table attachments enable row level security;
alter table approvals enable row level security;
alter table transactions enable row level security;
alter table import_batches enable row level security;
alter table import_errors enable row level security;
alter table audit_logs enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or current_user_role() = 'administrador');
create policy "profiles_update_own_or_admin" on profiles
  for update using (id = auth.uid() or current_user_role() = 'administrador');

-- ============================================================
-- companies (leitura por acesso; escrita só admin)
-- ============================================================
create policy "companies_select" on companies
  for select using (has_company_access(id));
create policy "companies_write_admin" on companies
  for insert with check (current_user_role() = 'administrador');
create policy "companies_update_admin" on companies
  for update using (current_user_role() = 'administrador');

-- ============================================================
-- user_company_access (apenas admin gerencia)
-- ============================================================
create policy "user_company_access_select" on user_company_access
  for select using (user_id = auth.uid() or current_user_role() = 'administrador');
create policy "user_company_access_write_admin" on user_company_access
  for all using (current_user_role() = 'administrador')
  with check (current_user_role() = 'administrador');

-- ============================================================
-- bank_accounts
-- ============================================================
create policy "bank_accounts_select" on bank_accounts
  for select using (has_company_access(company_id));
create policy "bank_accounts_write" on bank_accounts
  for insert with check (
    has_company_access(company_id)
    and current_user_role() in ('administrador', 'tesouraria')
  );
create policy "bank_accounts_update" on bank_accounts
  for update using (
    has_company_access(company_id)
    and current_user_role() in ('administrador', 'tesouraria')
  );

-- ============================================================
-- suppliers / customers (globais, visíveis a todos autenticados;
-- escrita para administrador e tesouraria)
-- ============================================================
create policy "suppliers_select" on suppliers for select using (auth.uid() is not null);
create policy "suppliers_write" on suppliers
  for insert with check (current_user_role() in ('administrador', 'tesouraria'));
create policy "suppliers_update" on suppliers
  for update using (current_user_role() in ('administrador', 'tesouraria'));

create policy "customers_select" on customers for select using (auth.uid() is not null);
create policy "customers_write" on customers
  for insert with check (current_user_role() in ('administrador', 'tesouraria'));
create policy "customers_update" on customers
  for update using (current_user_role() in ('administrador', 'tesouraria'));

-- ============================================================
-- cost_centers / projects (por empresa)
-- ============================================================
create policy "cost_centers_select" on cost_centers
  for select using (has_company_access(company_id));
create policy "cost_centers_write" on cost_centers
  for insert with check (
    has_company_access(company_id) and current_user_role() = 'administrador'
  );
create policy "cost_centers_update" on cost_centers
  for update using (current_user_role() = 'administrador');

create policy "projects_select" on projects
  for select using (has_company_access(company_id));
create policy "projects_write" on projects
  for insert with check (
    has_company_access(company_id) and current_user_role() = 'administrador'
  );
create policy "projects_update" on projects
  for update using (current_user_role() = 'administrador');

-- ============================================================
-- categories / subcategories (globais, só admin edita)
-- ============================================================
create policy "categories_select" on categories for select using (auth.uid() is not null);
create policy "categories_write" on categories
  for insert with check (current_user_role() = 'administrador');
create policy "categories_update" on categories
  for update using (current_user_role() = 'administrador');

create policy "subcategories_select" on subcategories for select using (auth.uid() is not null);
create policy "subcategories_write" on subcategories
  for insert with check (current_user_role() = 'administrador');
create policy "subcategories_update" on subcategories
  for update using (current_user_role() = 'administrador');

-- ============================================================
-- payments
-- ============================================================
create policy "payments_select" on payments
  for select using (has_company_access(company_id));
create policy "payments_insert" on payments
  for insert with check (
    has_company_access(company_id)
    and current_user_role() in ('administrador', 'tesouraria')
  );
create policy "payments_update" on payments
  for update using (
    has_company_access(company_id)
    and current_user_role() in ('administrador', 'tesouraria', 'aprovador')
  );

-- ============================================================
-- payment_realizations
-- ============================================================
create policy "payment_realizations_select" on payment_realizations
  for select using (
    exists (
      select 1 from payments p
      where p.id = payment_id and has_company_access(p.company_id)
    )
  );
create policy "payment_realizations_insert" on payment_realizations
  for insert with check (
    current_user_role() in ('administrador', 'tesouraria')
    and exists (
      select 1 from payments p
      where p.id = payment_id and has_company_access(p.company_id)
    )
  );

-- ============================================================
-- attachments (acesso segue a entidade pai — simplificado para pagamentos)
-- ============================================================
create policy "attachments_select" on attachments
  for select using (
    entity_type <> 'payment'
    or exists (
      select 1 from payments p
      where p.id = entity_id and has_company_access(p.company_id)
    )
  );
create policy "attachments_insert" on attachments
  for insert with check (current_user_role() in ('administrador', 'tesouraria'));

-- ============================================================
-- approvals
-- ============================================================
create policy "approvals_select" on approvals
  for select using (
    exists (
      select 1 from payments p
      where p.id = payment_id and has_company_access(p.company_id)
    )
  );
create policy "approvals_insert" on approvals
  for insert with check (current_user_role() in ('administrador', 'aprovador'));

-- ============================================================
-- transactions
-- ============================================================
create policy "transactions_select" on transactions
  for select using (has_company_access(company_id));
create policy "transactions_insert" on transactions
  for insert with check (
    has_company_access(company_id)
    and current_user_role() in ('administrador', 'tesouraria')
  );

-- ============================================================
-- import_batches / import_errors
-- ============================================================
create policy "import_batches_select" on import_batches
  for select using (current_user_role() in ('administrador', 'tesouraria', 'conciliacao'));
create policy "import_batches_insert" on import_batches
  for insert with check (current_user_role() in ('administrador', 'tesouraria', 'conciliacao'));

create policy "import_errors_select" on import_errors
  for select using (
    exists (
      select 1 from import_batches b where b.id = import_batch_id
    )
  );

-- ============================================================
-- audit_logs (leitura só admin; escrita via triggers/service role)
-- ============================================================
create policy "audit_logs_select_admin" on audit_logs
  for select using (current_user_role() = 'administrador');

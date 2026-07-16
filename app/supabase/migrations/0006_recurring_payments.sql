-- PagSmile Treasury — pagamentos fixos (recorrentes) e lançamento simplificado
-- O fluxo real de uso: lançar pagamentos já pagos, ou pagamentos fixos mensais
-- (aluguel, assinaturas) sem o valor exato até a fatura chegar.

create table recurring_payment_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  supplier_id uuid not null references suppliers(id),
  category_id uuid references categories(id),
  cost_center_id uuid references cost_centers(id),
  description text not null,
  day_of_month int not null check (day_of_month between 1 and 28),
  paying_bank_account_id uuid references bank_accounts(id),
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_recurring_templates_updated before update on recurring_payment_templates
  for each row execute function set_updated_at();

alter table payments add column recurring_template_id uuid references recurring_payment_templates(id);
alter table payments alter column gross_amount drop not null;
alter table payments alter column due_date drop not null;
alter table payments alter column expected_payment_date drop not null;
alter table payments alter column competence_date drop not null;
alter table payments alter column document_date drop not null;
alter table payments alter column category_id drop not null;
alter table payments alter column document_number drop not null;

-- Evita gerar o mesmo mês duas vezes para o mesmo template
create unique index payments_recurring_template_month_idx
  on payments (recurring_template_id, date_trunc('month', due_date))
  where recurring_template_id is not null;

alter table recurring_payment_templates enable row level security;

create policy "recurring_templates_select" on recurring_payment_templates
  for select using (has_company_access(company_id));
create policy "recurring_templates_insert" on recurring_payment_templates
  for insert with check (
    has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
  );
create policy "recurring_templates_update" on recurring_payment_templates
  for update using (
    has_company_access(company_id) and current_user_role() in ('administrador', 'tesouraria')
  );

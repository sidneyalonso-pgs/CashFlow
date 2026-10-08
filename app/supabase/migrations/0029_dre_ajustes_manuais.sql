-- Lancamentos manuais da DRE Gerencial (ex.: PDD), por empresa e mes.
create table dre_ajustes_manuais (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  periodo date not null, -- primeiro dia do mes
  linha text not null,
  valor numeric(18,2) not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (company_id, periodo, linha)
);

alter table dre_ajustes_manuais enable row level security;

create policy "dre_ajustes_select" on dre_ajustes_manuais for select
  using (current_user_role() in ('administrador', 'tesouraria', 'diretoria', 'fpa'));
create policy "dre_ajustes_insert" on dre_ajustes_manuais for insert
  with check (current_user_role() in ('administrador', 'tesouraria'));
create policy "dre_ajustes_update" on dre_ajustes_manuais for update
  using (current_user_role() in ('administrador', 'tesouraria'));
create policy "dre_ajustes_delete" on dre_ajustes_manuais for delete
  using (current_user_role() in ('administrador', 'tesouraria'));

-- Base de tarifas (Faturamento > Base de tarifas): introducer, frequencia de faturamento e "atualizado em".
alter table billing_clients  add column if not exists introducer_nome text;
alter table billing_clients  add column if not exists introducer_cnpj text;
alter table billing_clients  add column if not exists frequencia text;
alter table billing_clients  add column if not exists updated_at timestamptz not null default now();
alter table billing_subcontas add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_billing_clients_updated_at on billing_clients;
create trigger trg_billing_clients_updated_at before update on billing_clients
  for each row execute function set_updated_at();

drop trigger if exists trg_billing_subcontas_updated_at on billing_subcontas;
create trigger trg_billing_subcontas_updated_at before update on billing_subcontas
  for each row execute function set_updated_at();

-- dados que ja sabemos
update billing_clients
   set introducer_nome = 'HARDDY COMPANY LTDA', introducer_cnpj = '60.106.983/0001-77', frequencia = 'mensal'
 where cnpj = '55.613.668/0001-04';                       -- EVNO

update billing_clients set frequencia = 'mensal'
 where modelo in ('mensalidade', 'mensalidade_intro', 'bet', 'bets', 'combo') and frequencia is null;

update billing_clients set frequencia = 'semanal'
 where razao ilike 'VIDI TECH%' and frequencia is null;

update billing_clients set faixas_mens = '{"perc_repasse": 25}'::jsonb
 where cnpj = '69.820.465/0001-95';                       -- Victor Hugo: 25% do fee

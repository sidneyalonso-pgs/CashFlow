-- PagSmile Treasury — trilha de auditoria automática
-- Registra criação/edição das entidades financeiras principais em audit_logs.

create or replace function log_audit_event()
returns trigger as $$
declare
  v_action text;
  v_entity_id uuid;
begin
  if TG_OP = 'INSERT' then
    v_action := 'criacao';
    v_entity_id := new.id;
    insert into public.audit_logs (user_id, action, entity_type, entity_id, previous_value, new_value, source)
    values (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, null, to_jsonb(new), 'trigger');
    return new;
  elsif TG_OP = 'UPDATE' then
    v_action := 'edicao';
    v_entity_id := new.id;
    insert into public.audit_logs (user_id, action, entity_type, entity_id, previous_value, new_value, source)
    values (auth.uid(), v_action, TG_TABLE_NAME, v_entity_id, to_jsonb(old), to_jsonb(new), 'trigger');
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_companies after insert or update on companies
  for each row execute function log_audit_event();
create trigger trg_audit_bank_accounts after insert or update on bank_accounts
  for each row execute function log_audit_event();
create trigger trg_audit_suppliers after insert or update on suppliers
  for each row execute function log_audit_event();
create trigger trg_audit_payments after insert or update on payments
  for each row execute function log_audit_event();
create trigger trg_audit_payment_realizations after insert on payment_realizations
  for each row execute function log_audit_event();

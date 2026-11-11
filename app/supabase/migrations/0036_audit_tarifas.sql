-- PagSmile Treasury — histórico automático de alteração de tarifas
-- Toda criação/edição de contas (billing_subcontas) e clientes (billing_clients) da base de
-- tarifas passa a gravar o valor anterior e o novo em audit_logs (reaproveita log_audit_event).
-- Consulta: select created_at, previous_value, new_value from audit_logs
--           where entity_type = 'billing_subcontas' and entity_id = '<id da conta>' order by created_at;

drop trigger if exists trg_audit_billing_subcontas on billing_subcontas;
create trigger trg_audit_billing_subcontas after insert or update on billing_subcontas
  for each row execute function log_audit_event();

drop trigger if exists trg_audit_billing_clients on billing_clients;
create trigger trg_audit_billing_clients after insert or update on billing_clients
  for each row execute function log_audit_event();

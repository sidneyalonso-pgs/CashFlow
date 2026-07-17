-- PagSmile Treasury — pagamentos recorrentes podem ser agendados por
-- semana do mês (1-5) além de (ou em vez de) um dia fixo do mês.

alter table recurring_payment_templates alter column day_of_month drop not null;
alter table recurring_payment_templates add column week_of_month int check (week_of_month between 1 and 5);
alter table recurring_payment_templates add constraint recurring_templates_schedule_check
  check (day_of_month is not null or week_of_month is not null);

-- Ajusta o índice de deduplicação mensal: agora baseado no due_date gerado
-- (já cobre os dois modos de agendamento, nenhuma mudança de schema necessária ali).

alter table reconciliations drop constraint if exists reconciliations_entity_type_check;
alter table reconciliations add constraint reconciliations_entity_type_check
  check (entity_type in ('payment', 'revenue', 'investment_application', 'investment_redemption', 'transfer'));

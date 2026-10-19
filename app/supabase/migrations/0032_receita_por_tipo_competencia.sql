-- Central Piloto: uma receita POR TIPO e por dia de referência (Fee Pix, Fee TED, Fee Onboarding,
-- Remuneração Conta PI, Remuneração CCME), cada uma na sua categoria. A tabela revenue_components
-- (migration 0030) deixa de ser usada pelas telas; fica no banco só como histórico.
--
--   competence_date = dia de REFERÊNCIA (a DRE usa para a competência)
--   expected_date / realized_date = dia da APURAÇÃO (caixa, Cash Flow, conciliação)
--   componente = tipo da receita da Central ('fee_pix', 'fee_ted', 'fee_onboarding', 'rem_spi', 'rem_ccme')
-- Rodar DEPOIS da 0031.

alter table revenues add column if not exists competence_date date;
alter table revenues add column if not exists componente text;

create index if not exists revenues_central_idx
  on revenues (company_id, origem, competence_date, componente);

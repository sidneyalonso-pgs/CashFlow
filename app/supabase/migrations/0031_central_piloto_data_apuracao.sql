-- Central Piloto: duas datas por lançamento.
--   data            = data de REFERÊNCIA (o dia a que a receita se refere; competência da DRE)
--   data_apuracao   = data de APURAÇÃO (o dia em que o dinheiro cai na conta; caixa, Receitas,
--                     Cash Flow e conciliação). Normalmente o primeiro dia útil seguinte.
--
-- A receita única passa a ser por data de apuração + banco (soma das referências que caíram
-- juntas), e a composição guarda a data de referência de cada parte. Rodar DEPOIS da 0030.

alter table salva_guarda_diario add column if not exists data_apuracao date;
update salva_guarda_diario set data_apuracao = data where data_apuracao is null;

create index if not exists salva_guarda_diario_apuracao_idx
  on salva_guarda_diario (company_id, data_apuracao, receipt_bank_account_id);

alter table revenue_components add column if not exists data_referencia date;

-- a mesma receita agora pode ter o mesmo tipo em vários dias de referência
alter table revenue_components drop constraint if exists revenue_components_revenue_id_componente_key;
alter table revenue_components
  add constraint revenue_components_revenue_comp_ref_key unique (revenue_id, componente, data_referencia);

-- mês de referência da projeção (ex.: '2026-10'): é por ele que a projeção é apagada e refeita,
-- porque o caixa de uma referência do fim do mês cai no mês seguinte
alter table revenues add column if not exists origem_ref text;

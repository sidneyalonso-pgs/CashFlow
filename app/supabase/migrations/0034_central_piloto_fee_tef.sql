-- Central Piloto: novo tipo de receita, Fee TEF (componente 'fee_tef', categoria "Fee TEF").
-- A categoria "Fee TEF" precisa existir (entrada, receita, 1. Receitas Brutas): o app cria o lançamento por ela.
-- Rodar DEPOIS da 0032.

alter table salva_guarda_diario add column if not exists fee_tef numeric(18,2);

insert into categories (name, allowed_direction, financial_nature, economic_classification, fpa_classification, status)
select 'Fee TEF', 'entrada', 'operacional', 'receita', '1. Receitas Brutas', 'ativo'
where not exists (select 1 from categories where name = 'Fee TEF');

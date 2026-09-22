-- Codigo da empresa no sistema da contabilidade (ex.: "2212" para Pagsmile IP) — vai na
-- coluna "Lote" do relatorio De-Para Contabil.
alter table companies add column codigo_contabil text;

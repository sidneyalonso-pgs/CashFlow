-- Segunda categoria do fornecedor: a classificação DRE (linha da DRE gerencial em que as despesas
-- dele entram). A categoria atual (default_category_id) continua servindo ao FP&A e ao fluxo de caixa.
alter table suppliers add column if not exists dre_classification text;

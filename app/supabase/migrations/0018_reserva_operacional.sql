-- Reserva operacional por empresa: valor mínimo que deve ficar preservado em caixa e não
-- entra na capacidade para decisão.
--
-- Fica NULL de propósito enquanto a diretoria não definir o valor de cada empresa. NULL
-- significa "não definida" e a tela mostra isso explicitamente, em vez de assumir zero e
-- inflar a capacidade. Não use 0 como default: zero é uma decisão ("não queremos reserva"),
-- ausência é outra ("ainda não decidimos").

alter table companies
  add column if not exists operational_reserve numeric(18, 2);

comment on column companies.operational_reserve is
  'Reserva operacional mínima da empresa. NULL = não definida; a capacidade para decisão é calculada sem reserva e a tela sinaliza a pendência.';

-- Exemplo de preenchimento, quando os valores forem definidos:
--   update companies set operational_reserve = 1000000 where trade_name = 'Pagsmile IP';

-- Vínculo entre as duas pernas de um movimento entre empresas do grupo.
--
-- O problema: dinheiro que sai da empresa A e entra na empresa B chega ao sistema por dois
-- extratos diferentes, e cada lado é lançado de forma independente — uma transferência de
-- saída em A e, muitas vezes, uma receita em B (com classificação contábil própria, que é
-- correta e não deve ser descartada). Sem nada ligando os dois registros, o consolidado
-- mostra R$ X entrando e R$ X saindo, quando o grupo não ganhou nem perdeu nada.
--
-- A solução é um identificador compartilhado: as duas pernas recebem o mesmo intercompany_ref.
-- Um uuid qualquer serve, o valor em si não importa — importa ser igual nos dois lados. Assim
-- funciona para qualquer combinação de pernas (transferência com receita, transferência com
-- transferência, transferência com pagamento) e a eliminação no consolidado fica auditável.
--
-- O saldo NÃO muda: as duas pernas saem juntas do bruto, então a diferença entre entradas e
-- saídas continua a mesma. O que deixa de acontecer é a inflação simultânea dos dois totais.

alter table transfers add column if not exists intercompany_ref uuid;
alter table revenues  add column if not exists intercompany_ref uuid;
alter table payments   add column if not exists intercompany_ref uuid;

create index if not exists transfers_intercompany_ref_idx on transfers (intercompany_ref) where intercompany_ref is not null;
create index if not exists revenues_intercompany_ref_idx  on revenues  (intercompany_ref) where intercompany_ref is not null;
create index if not exists payments_intercompany_ref_idx  on payments  (intercompany_ref) where intercompany_ref is not null;

comment on column transfers.intercompany_ref is
  'Mesmo valor nas duas pernas de um movimento entre empresas do grupo. Preenchido pela tela Conciliação > Intercompany. Quando as duas pernas estão no escopo consolidado, ambas saem do bruto e o saldo não muda.';
comment on column revenues.intercompany_ref is
  'Mesmo valor da perna correspondente em transfers/payments quando a receita é dinheiro vindo de outra empresa do grupo.';
comment on column payments.intercompany_ref is
  'Mesmo valor da perna correspondente em transfers/revenues quando o pagamento é dinheiro indo para outra empresa do grupo.';

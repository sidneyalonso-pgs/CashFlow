-- PagSmile Treasury — tipo de custo do fornecedor (despesa/custo direto/custo indireto),
-- carregado automaticamente para o pagamento quando o fornecedor é selecionado.

create type cost_type as enum ('despesas', 'custo_direto', 'custo_indireto');

alter table suppliers add column cost_type cost_type not null default 'despesas';
alter table payments add column cost_type cost_type;

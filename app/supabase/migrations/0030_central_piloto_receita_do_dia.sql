-- Central Piloto: receita do dia por tipo (Fee PIX, Fee TED, Fee Onboarding, Remuneração SPI,
-- Remuneração CCME) + Total apurado + Banco de recebimento.
--
-- O sistema agrupa as cinco parcelas numa receita ÚNICA por dia (é ela que casa 1 a 1 com o
-- crédito do extrato) e guarda a composição em revenue_components, para a DRE separar cada
-- parte na sua categoria. A projeção do restante do mês (média das 5 últimas apurações) também
-- vira receita estimada, com a mesma composição.

-- colunas novas na tabela da Central (as antigas ficam: o relatório diário e o histórico usam)
alter table salva_guarda_diario
  add column if not exists fee_pix numeric(18,2),
  add column if not exists fee_ted numeric(18,2),
  add column if not exists fee_onboarding numeric(18,2),
  add column if not exists total_apurado numeric(18,2),
  add column if not exists receipt_bank_account_id uuid references bank_accounts(id),
  add column if not exists revenue_id uuid references revenues(id);

-- histórico: o "Fee" antigo passa a ser Fee PIX; total e banco derivados do que já existe
update salva_guarda_diario set fee_pix = fee where fee_pix is null and fee is not null;
update salva_guarda_diario
  set total_apurado = coalesce(fee, 0) + coalesce(remuneracao_spi, 0) + coalesce(remuneracao_ccme, 0)
  where total_apurado is null;
update salva_guarda_diario
  set receipt_bank_account_id = coalesce(fee_bank_account_id, remuneracao_spi_bank_account_id, remuneracao_ccme_bank_account_id)
  where receipt_bank_account_id is null;

-- origem da receita: 'central_piloto' (apurada) ou 'projecao_central_piloto' (estimada).
-- Receita com origem só é alterada pela Central Piloto.
alter table revenues add column if not exists origem text;

-- composição da receita por categoria (DRE e FP&A leem daqui)
create table if not exists revenue_components (
  id uuid primary key default gen_random_uuid(),
  revenue_id uuid not null references revenues(id) on delete cascade,
  componente text not null,
  category_id uuid references categories(id),
  amount numeric(18,2) not null default 0,
  unique (revenue_id, componente)
);

create index if not exists revenue_components_revenue_idx on revenue_components(revenue_id);

alter table revenue_components enable row level security;

-- leitura para qualquer usuário autenticado; a escrita é feita só pelo servidor (service role)
create policy "revenue_components_select" on revenue_components for select using (auth.uid() is not null);

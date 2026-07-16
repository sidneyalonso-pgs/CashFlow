-- PagSmile Treasury — dados de demonstração (fictícios, não usar dados reais)
-- Rodar após criar ao menos um usuário via Supabase Auth e ele já ter um profile
-- (criado automaticamente pelo trigger handle_new_user).

insert into companies (id, legal_name, trade_name, cnpj, default_currency, status) values
  ('11111111-1111-1111-1111-111111111111', 'Alfa Comércio Digital Ltda', 'Alfa Digital', '11.111.111/0001-11', 'BRL', 'ativo'),
  ('22222222-2222-2222-2222-222222222222', 'Beta Serviços Financeiros S.A.', 'Beta Financeira', '22.222.222/0001-22', 'BRL', 'ativo'),
  ('33333333-3333-3333-3333-333333333333', 'Gama Tecnologia Ltda', 'Gama Tech', '33.333.333/0001-33', 'BRL', 'ativo');

insert into bank_accounts (company_id, bank_name, bank_code, branch, account_number, nickname, account_type, currency, initial_balance, initial_balance_date) values
  ('11111111-1111-1111-1111-111111111111', 'Banco do Brasil', '001', '1234', '00012345-6', 'Alfa - Conta Principal', 'conta_corrente', 'BRL', 150000, current_date),
  ('11111111-1111-1111-1111-111111111111', 'Itaú', '341', '5678', '00098765-4', 'Alfa - Investimentos', 'conta_investimento', 'BRL', 300000, current_date),
  ('22222222-2222-2222-2222-222222222222', 'Bradesco', '237', '4321', '00011122-3', 'Beta - Conta Principal', 'conta_corrente', 'BRL', 220000, current_date),
  ('33333333-3333-3333-3333-333333333333', 'Santander', '033', '8765', '00033344-5', 'Gama - Conta Principal', 'conta_corrente', 'BRL', 90000, current_date),
  ('33333333-3333-3333-3333-333333333333', 'Nubank', '260', '0001', '00099887-7', 'Gama - Pagamentos', 'conta_pagamento', 'BRL', 40000, current_date);

insert into categories (id, name, allowed_direction, financial_nature, economic_classification, fpa_classification) values
  ('c1111111-0000-0000-0000-000000000001', 'Fornecedores Operacionais', 'saida', 'operacional', 'custo', 'custo_direto'),
  ('c1111111-0000-0000-0000-000000000002', 'Folha de Pagamento', 'saida', 'folha', 'despesa', 'despesa_administrativa'),
  ('c1111111-0000-0000-0000-000000000003', 'Tributos', 'saida', 'tributaria', 'despesa', 'despesa_administrativa'),
  ('c1111111-0000-0000-0000-000000000004', 'Receita de Vendas', 'entrada', 'operacional', 'receita', 'receita_operacional'),
  ('c1111111-0000-0000-0000-000000000005', 'Receita Financeira', 'entrada', 'financeira', 'receita', 'receita_financeira');

insert into cost_centers (company_id, code, name, responsible_area, status) values
  ('11111111-1111-1111-1111-111111111111', 'CC01', 'Comercial', 'Vendas', 'ativo'),
  ('11111111-1111-1111-1111-111111111111', 'CC02', 'Operações', 'Operações', 'ativo'),
  ('22222222-2222-2222-2222-222222222222', 'CC03', 'Financeiro', 'Financeiro', 'ativo'),
  ('33333333-3333-3333-3333-333333333333', 'CC04', 'Tecnologia', 'TI', 'ativo');

insert into suppliers (legal_name, tax_id, person_type, trade_name, status) values
  ('Fornecedor Papelaria Ltda', '10.000.001/0001-01', 'juridica', 'Papelaria Central', 'ativo'),
  ('Consultoria Jurídica ABC', '10.000.002/0001-02', 'juridica', 'ABC Advogados', 'ativo'),
  ('Transportadora Rápida S.A.', '10.000.003/0001-03', 'juridica', 'Rápida Log', 'ativo'),
  ('Serviços de TI Cloud Ltda', '10.000.004/0001-04', 'juridica', 'CloudTI', 'ativo'),
  ('Manutenção Predial ME', '10.000.005/0001-05', 'juridica', 'PredialME', 'ativo'),
  ('João da Silva Consultor', '111.222.333-44', 'fisica', null, 'ativo'),
  ('Gráfica Nova Era Ltda', '10.000.007/0001-07', 'juridica', 'Nova Era', 'ativo'),
  ('Energia Elétrica Distribuidora', '10.000.008/0001-08', 'juridica', null, 'ativo'),
  ('Telecom Corporativa S.A.', '10.000.009/0001-09', 'juridica', null, 'ativo'),
  ('Seguradora Proteção Total', '10.000.010/0001-10', 'juridica', null, 'ativo'),
  ('Escritório de Contabilidade XYZ', '10.000.011/0001-11', 'juridica', null, 'ativo'),
  ('Locadora de Veículos Fast', '10.000.012/0001-12', 'juridica', null, 'ativo'),
  ('Material de Escritório BR', '10.000.013/0001-13', 'juridica', null, 'ativo'),
  ('Agência de Marketing Criativa', '10.000.014/0001-14', 'juridica', null, 'ativo'),
  ('Segurança Patrimonial Vigilant', '10.000.015/0001-15', 'juridica', null, 'ativo');

insert into customers (name, tax_id, company_id, default_revenue_type, status) values
  ('Cliente Corporativo Norte Ltda', '20.000.001/0001-01', '11111111-1111-1111-1111-111111111111', 'receita_operacional', 'ativo'),
  ('Cliente Varejo Sul S.A.', '20.000.002/0001-02', '11111111-1111-1111-1111-111111111111', 'receita_operacional', 'ativo'),
  ('Parceiro Distribuidor Leste', '20.000.003/0001-03', '22222222-2222-2222-2222-222222222222', 'receita_operacional', 'ativo'),
  ('Cliente Governo Estadual', '20.000.004/0001-04', '33333333-3333-3333-3333-333333333333', 'receita_operacional', 'ativo'),
  ('Cliente Internacional Import', '20.000.005/0001-05', '33333333-3333-3333-3333-333333333333', 'receita_operacional', 'ativo');

-- Observação: payments/revenues de exemplo dependem de supplier_id/company_id reais
-- gerados acima. Depois de rodar este seed, use a tela de "Importação" ou o
-- Table Editor do Supabase para popular alguns pagamentos e receitas de teste.

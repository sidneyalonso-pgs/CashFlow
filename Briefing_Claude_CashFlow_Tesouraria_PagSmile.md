# Cash Flow & Tesouraria PagSmile
## Documento mestre para desenvolvimento no Claude Code

> **Instrução principal ao Claude:** construa uma aplicação web funcional, modular e pronta para evolução, seguindo este documento como fonte de verdade. Não crie uma landing page. Não entregue apenas telas estáticas. Implemente autenticação, banco de dados, regras financeiras, uploads, importações, filtros, cálculos, histórico e permissões.

---

# 1. Nome do produto

**PagSmile Treasury**

Subtítulo sugerido:

**Gestão de caixa, pagamentos, receitas e conciliação**

Não criar uma nova marca e não redesenhar o logotipo. Utilizar o logotipo oficial disponibilizado na pasta do projeto:

- `pagsmile-logo-navy.png`
- `pagsmile-logo-transparent.png`

Preferência de uso:

- fundo branco ou claro: `pagsmile-logo-navy.png`;
- fundo azul-marinho: `pagsmile-logo-transparent.png`.

---

# 2. Contexto do projeto

Hoje o Cash Flow é controlado principalmente em Excel. O arquivo apresenta números, mas não oferece uma estrutura adequada para:

- armazenar histórico;
- consultar movimentações com filtros;
- acompanhar entradas e saídas;
- registrar pagamentos;
- anexar documentos fiscais;
- comparar previsto e realizado;
- acompanhar receita estimada;
- visualizar a posição financeira por empresa e conta;
- apoiar a conciliação bancária;
- fornecer dados classificados para FP&A;
- garantir rastreabilidade das alterações.

O projeto deverá transformar esse processo em uma aplicação financeira interna.

A aplicação será voltada inicialmente para Tesouraria, Financeiro, Conciliação e liderança. O módulo de FP&A será construído por último, consumindo as informações classificadas nos módulos anteriores.

---

# 3. Objetivo do produto

Criar uma plataforma de Tesouraria que centralize:

1. pagamentos;
2. entradas e receitas;
3. projeções financeiras;
4. contas bancárias;
5. movimentações realizadas;
6. movimentações previstas;
7. documentos e notas fiscais;
8. conciliação;
9. histórico do caixa;
10. visão consolidada por empresa;
11. classificações gerenciais;
12. dados estruturados para FP&A.

O sistema deve responder:

- Quanto cada empresa possui hoje?
- Quanto existe em cada conta bancária?
- Quais pagamentos já foram realizados?
- Quais pagamentos ainda vencerão?
- Quais receitas são esperadas?
- Quanto entra e sai em cada período?
- Qual é o saldo realizado?
- Qual é o saldo projetado?
- Quais movimentações ainda não foram conciliadas?
- Quais categorias e centros de custo mais consomem caixa?
- Qual será a posição de caixa em 7, 15, 30, 60 e 90 dias?
- Quais informações poderão ser utilizadas posteriormente pelo FP&A?

---

# 4. Princípios do projeto

## 4.1 Simplicidade operacional

O sistema deve ser mais fácil do que a planilha atual.

## 4.2 Uma movimentação por registro

Cada entrada, saída, aplicação, resgate, transferência ou ajuste deve ser armazenado como um registro individual.

## 4.3 Histórico completo

Não sobrescrever informações financeiras sem manter histórico.

## 4.4 Classificação estruturada

Separar corretamente:

- entrada e saída;
- receita e despesa;
- custo e investimento;
- transferência e movimentação econômica;
- previsto e realizado;
- competência e caixa.

## 4.5 Evolução por módulos

A solução deve ser implementada em etapas, sem tentar construir tudo ao mesmo tempo.

## 4.6 Segurança

Os dados são financeiros e sensíveis. Utilizar autenticação, autorização por perfil, logs, armazenamento seguro e regras no banco.

## 4.7 Fonte única da verdade

O banco de dados deve ser a fonte oficial. Dashboards e relatórios devem consumir os mesmos registros.

---

# 5. Escopo por fases

## Fase 1 — Cadastros, pagamentos e movimentações realizadas

Construir primeiro:

- autenticação;
- empresas;
- fornecedores;
- clientes ou fontes de receita;
- contas bancárias;
- categorias;
- subcategorias;
- centros de custo;
- projetos;
- cadastro de pagamentos;
- cadastro de recebimentos;
- upload de notas fiscais;
- lançamento manual;
- importação por Excel;
- tabela geral de movimentações;
- dashboard do realizado;
- trilha de auditoria.

## Fase 2 — Cash Flow e projeções

Adicionar:

- receitas estimadas;
- despesas previstas;
- pagamentos agendados;
- recorrências;
- projeção de caixa;
- saldo inicial;
- saldo realizado;
- saldo projetado;
- previsto versus realizado;
- reprogramação;
- projeção em 7, 15, 30, 60 e 90 dias;
- alertas de caixa.

## Fase 3 — Conciliação bancária

Adicionar:

- importação de extrato;
- movimentos do extrato;
- correspondências automáticas sugeridas;
- conciliação manual;
- conciliação em massa;
- divergências;
- duplicidades;
- pendências;
- histórico da conciliação.

## Fase 4 — FP&A

Construir por último:

- realizado por centro de custo;
- realizado por categoria;
- realizado por empresa;
- classificação de custos e despesas;
- custos diretos e indiretos;
- despesas fixas e variáveis;
- recorrentes e não recorrentes;
- orçamento;
- forecast;
- realizado versus orçamento;
- realizado versus forecast;
- variações;
- justificativas;
- exportações gerenciais.

---

# 6. Perfis de usuário

Criar os seguintes perfis:

## Administrador

Pode:

- visualizar tudo;
- administrar usuários;
- administrar cadastros;
- importar;
- criar;
- editar;
- cancelar;
- conciliar;
- aprovar;
- exportar;
- acessar auditoria;
- configurar parâmetros.

## Tesouraria

Pode:

- visualizar empresas autorizadas;
- cadastrar e editar pagamentos;
- cadastrar e editar recebimentos;
- anexar documentos;
- importar arquivos;
- atualizar status;
- consultar o cash flow;
- registrar aplicações, resgates e transferências;
- conciliar movimentações.

## Aprovador

Pode:

- consultar pagamentos;
- aprovar;
- rejeitar;
- devolver para correção;
- registrar observações.

## Conciliação

Pode:

- importar extratos;
- visualizar movimentações;
- conciliar;
- marcar divergências;
- classificar pendências;
- desfazer conciliações autorizadas.

## FP&A

Pode:

- consultar dados classificados;
- revisar centros de custo;
- revisar categorias gerenciais;
- importar orçamento;
- analisar variações;
- exportar relatórios.

## Visualizador

Pode apenas consultar dashboards e relatórios permitidos.

Implementar controle por empresa, além do perfil.

---

# 7. Estrutura organizacional

## 7.1 Empresas do grupo

Criar cadastro configurável.

Campos:

- ID;
- razão social;
- nome fantasia;
- CNPJ;
- moeda padrão;
- status;
- data de criação;
- usuário responsável.

Não fixar empresas diretamente no código.

## 7.2 Contas bancárias

Campos:

- empresa;
- banco;
- código do banco;
- agência;
- número da conta;
- apelido;
- tipo da conta;
- moeda;
- saldo inicial;
- data-base do saldo inicial;
- considera no caixa disponível;
- status;
- observação.

Tipos possíveis:

- conta corrente;
- conta pagamento;
- conta arrecadadora;
- conta garantia;
- conta investimento;
- conta restrita;
- outra.

## 7.3 Fornecedores

Campos obrigatórios:

- razão social ou nome;
- CPF ou CNPJ;
- tipo de pessoa;
- status.

Campos adicionais:

- nome fantasia;
- categoria padrão;
- centro de custo padrão;
- banco;
- agência;
- conta;
- chave Pix;
- e-mail;
- telefone;
- observação;
- data de cadastro;
- usuário responsável.

Validar CPF e CNPJ.

## 7.4 Clientes e fontes de receita

Campos:

- nome ou razão social;
- CPF ou CNPJ;
- empresa relacionada;
- tipo de receita padrão;
- categoria padrão;
- status;
- observação.

## 7.5 Centros de custo

Campos:

- código;
- nome;
- empresa;
- área responsável;
- gestor;
- status.

## 7.6 Categorias e subcategorias

A classificação deve ser configurável.

Campos da categoria:

- nome;
- direção permitida;
- natureza;
- classificação gerencial;
- classificação para FP&A;
- status.

Campos da subcategoria:

- categoria pai;
- nome;
- status.

## 7.7 Projetos

Campos:

- código;
- nome;
- empresa;
- centro de custo;
- responsável;
- data inicial;
- data final;
- status.

---

# 8. Conceitos financeiros

## 8.1 Direção da movimentação

- Entrada
- Saída

## 8.2 Situação temporal

- Prevista
- Realizada
- Parcialmente realizada
- Reprogramada
- Cancelada

## 8.3 Natureza financeira

- Operacional
- Financeira
- Investimento
- Financiamento
- Transferência
- Intercompany
- Tributária
- Folha
- Ajuste

## 8.4 Classificação econômica

- Receita
- Custo
- Despesa
- Investimento
- Captação
- Amortização
- Transferência
- Aplicação
- Resgate
- Ajuste patrimonial
- Não classificado

## 8.5 Classificação para FP&A

Preparar desde o início:

- receita operacional;
- receita financeira;
- custo direto;
- custo indireto;
- despesa operacional;
- despesa administrativa;
- despesa financeira;
- investimento;
- CAPEX;
- OPEX;
- não recorrente;
- intercompany;
- não aplicável.

## 8.6 Comportamento

- Fixo
- Variável
- Semivariável
- Não aplicável

## 8.7 Recorrência

- Recorrente
- Não recorrente

---

# 9. Módulo de pagamentos

## 9.1 Objetivo

Registrar todos os pagamentos realizados ou previstos pelas empresas do grupo.

## 9.2 Campos obrigatórios do pagamento

- empresa;
- fornecedor;
- descrição;
- valor;
- moeda;
- data do documento;
- data de vencimento;
- data prevista de pagamento;
- competência;
- categoria;
- número da nota fiscal ou documento;
- arquivo da nota fiscal ou documento;
- status.

## 9.3 Campos adicionais

- subcategoria;
- centro de custo;
- projeto;
- natureza;
- classificação econômica;
- classificação para FP&A;
- fixo ou variável;
- recorrente ou não recorrente;
- número do pedido;
- número do contrato;
- forma de pagamento;
- conta bancária pagadora;
- data efetiva de pagamento;
- valor efetivamente pago;
- juros;
- multa;
- desconto;
- impostos retidos;
- valor líquido;
- contraparte;
- identificador bancário;
- observação;
- aprovador;
- data de aprovação;
- usuário criador;
- usuário editor.

## 9.4 Status do pagamento

- Rascunho
- Pendente de aprovação
- Aprovado
- Rejeitado
- Agendado
- Pago parcialmente
- Pago
- Vencido
- Cancelado

## 9.5 Formas de pagamento

- Pix
- TED
- Boleto
- Débito automático
- Cartão
- Transferência interna
- Outro

## 9.6 Nota fiscal e documentos

Permitir upload de:

- PDF;
- PNG;
- JPG;
- JPEG;
- XML;
- XLSX;
- CSV.

Regras:

- armazenar em storage privado;
- registrar nome original;
- registrar tipo;
- registrar tamanho;
- registrar usuário;
- registrar data;
- permitir download apenas a usuários autorizados;
- permitir mais de um anexo;
- não excluir fisicamente sem política administrativa.

## 9.7 Cálculo do pagamento

Valor líquido sugerido:

`valor bruto + juros + multa - desconto - impostos retidos`

O valor pago pode ser diferente do valor previsto.

## 9.8 Pagamento parcial

Permitir múltiplas realizações vinculadas ao mesmo pagamento.

Exemplo:

- pagamento previsto: R$ 100.000;
- realizado 1: R$ 60.000;
- realizado 2: R$ 40.000.

Status final:

- parcialmente pago enquanto houver saldo;
- pago quando o saldo for zerado.

---

# 10. Módulo de receitas e entradas

## 10.1 Tipos de entrada

- Receita operacional
- Receita financeira
- Aporte
- Empréstimo
- Recebimento intercompany
- Resgate
- Estorno
- Reembolso
- Transferência recebida
- Outra entrada

## 10.2 Campos da receita ou entrada

Campos obrigatórios:

- empresa;
- origem ou cliente;
- descrição;
- valor estimado;
- moeda;
- data prevista;
- natureza;
- categoria;
- status.

Campos adicionais:

- valor realizado;
- data realizada;
- competência;
- conta bancária recebedora;
- probabilidade;
- recorrência;
- contrato;
- documento;
- identificador bancário;
- centro de resultado;
- classificação para FP&A;
- observação.

## 10.3 Receita estimada

Criar uma funcionalidade específica para receitas estimadas.

Campos:

- empresa;
- cliente ou origem;
- tipo de receita;
- descrição;
- valor estimado;
- data esperada;
- probabilidade;
- valor ponderado;
- status;
- responsável;
- observação.

Cálculo:

`valor ponderado = valor estimado × probabilidade`

Probabilidade entre 0% e 100%.

Permitir visualizar:

- valor bruto estimado;
- valor ponderado;
- valor realizado;
- diferença;
- atraso.

## 10.4 Status da receita

- Estimada
- Confirmada
- Parcialmente recebida
- Recebida
- Atrasada
- Reprogramada
- Cancelada

---

# 11. Módulo geral de movimentações

Criar uma tabela central para consulta de todas as movimentações.

## 11.1 Colunas principais

- data;
- empresa;
- conta;
- direção;
- natureza;
- classificação econômica;
- categoria;
- subcategoria;
- fornecedor ou cliente;
- descrição;
- documento;
- valor previsto;
- valor realizado;
- status;
- conciliação;
- origem;
- usuário.

## 11.2 Recursos da tabela

- busca textual;
- filtros combináveis;
- ordenação;
- paginação;
- seleção de linhas;
- ações em massa;
- exportação;
- edição;
- visualização detalhada;
- duplicação controlada;
- cancelamento;
- anexos;
- histórico.

## 11.3 Filtros

- período;
- empresa;
- conta;
- fornecedor;
- cliente;
- direção;
- natureza;
- categoria;
- subcategoria;
- centro de custo;
- projeto;
- status;
- conciliação;
- recorrência;
- competência;
- classificação para FP&A.

---

# 12. Módulo de Cash Flow

## 12.1 Objetivo

Apresentar a evolução do caixa realizado e projetado.

## 12.2 Fórmula

`saldo final = saldo inicial + entradas - saídas`

## 12.3 Visões

- diário;
- semanal;
- mensal;
- por empresa;
- por conta;
- consolidado;
- realizado;
- projetado;
- realizado + projetado.

## 12.4 Horizontes

- hoje;
- 7 dias;
- 15 dias;
- 30 dias;
- 60 dias;
- 90 dias.

## 12.5 Linhas da matriz

- saldo inicial;
- entradas operacionais;
- entradas financeiras;
- outras entradas;
- total de entradas;
- pagamentos a fornecedores;
- folha;
- tributos;
- despesas financeiras;
- investimentos;
- outras saídas;
- total de saídas;
- saldo final;
- aplicações;
- caixa disponível total.

Permitir abrir qualquer valor e visualizar sua composição.

## 12.6 Previsto versus realizado

Comparar:

- valor previsto;
- valor realizado;
- diferença nominal;
- diferença percentual;
- data prevista;
- data realizada;
- dias de atraso ou antecipação.

## 12.7 Reprogramação

Ao alterar uma data prevista:

- não apagar a data anterior;
- registrar histórico;
- registrar usuário;
- permitir justificativa;
- manter a versão original.

## 12.8 Snapshots

Criar snapshot diário do Cash Flow.

Campos:

- data do snapshot;
- empresa;
- conta;
- período projetado;
- saldo projetado;
- entradas projetadas;
- saídas projetadas;
- usuário;
- data de geração.

Isso permitirá comparar como a previsão evoluiu ao longo do tempo.

---

# 13. Transferências, aplicações e intercompany

## 13.1 Transferência entre contas da mesma empresa

Gerar dois movimentos vinculados:

- saída na conta de origem;
- entrada na conta de destino.

No consolidado da empresa, impacto líquido deve ser zero.

## 13.2 Transferência entre empresas

Gerar:

- saída na empresa de origem;
- entrada na empresa de destino.

Classificar como intercompany.

No consolidado do grupo, permitir eliminar o efeito.

## 13.3 Aplicação financeira

Gerar:

- redução da conta corrente;
- aumento da posição investida.

Não classificar como despesa operacional.

## 13.4 Resgate

Gerar:

- aumento da conta corrente;
- redução da posição investida.

Não classificar como receita operacional.

## 13.5 Investimentos

Campos:

- empresa;
- instituição;
- produto;
- conta;
- valor aplicado;
- data da aplicação;
- data de vencimento;
- liquidez;
- taxa;
- indexador;
- saldo bruto;
- saldo líquido;
- rendimento;
- status.

---

# 14. Conciliação bancária

## 14.1 Importação de extrato

Aceitar:

- XLSX;
- CSV;
- OFX, se possível.

Fluxo:

1. selecionar empresa;
2. selecionar conta;
3. selecionar período;
4. enviar arquivo;
5. mapear colunas;
6. visualizar prévia;
7. validar;
8. importar;
9. sugerir correspondências.

## 14.2 Campos do extrato

- data;
- descrição bancária;
- valor;
- direção;
- saldo;
- documento;
- identificador;
- conta;
- arquivo de origem.

## 14.3 Sugestão automática

Sugerir correspondência por:

- mesma conta;
- mesmo valor;
- data igual ou próxima;
- mesmo documento;
- descrição semelhante;
- contraparte semelhante.

Não conciliar automaticamente sem regra e confiança configuradas.

## 14.4 Status

- Pendente
- Sugestão encontrada
- Conciliado automaticamente
- Conciliado manualmente
- Divergente
- Ignorado
- Cancelado

## 14.5 Tela de conciliação

Exibir lado a lado:

- movimento interno;
- movimento bancário;
- diferença;
- score de correspondência;
- ações.

Ações:

- conciliar;
- desfazer;
- marcar divergência;
- criar movimento a partir do extrato;
- ignorar;
- dividir;
- agrupar.

---

# 15. Módulo de FP&A

> Construir somente após os módulos de Tesouraria, Cash Flow e Conciliação estarem funcionando.

## 15.1 Objetivo

Consumir os dados já cadastrados e classificados, evitando nova digitação.

## 15.2 Campos necessários

- empresa;
- competência;
- centro de custo;
- projeto;
- categoria;
- subcategoria;
- classificação gerencial;
- classificação para FP&A;
- fixo ou variável;
- recorrente ou não recorrente;
- CAPEX ou OPEX;
- realizado;
- orçamento;
- forecast.

## 15.3 Funcionalidades

- importação de orçamento;
- importação de forecast;
- versão do orçamento;
- versão do forecast;
- realizado versus orçamento;
- realizado versus forecast;
- variação nominal;
- variação percentual;
- justificativa;
- responsável;
- comentários;
- exportação.

## 15.4 Visões

- DRE gerencial simplificada;
- despesas por centro de custo;
- custos por produto;
- custos diretos e indiretos;
- despesas fixas e variáveis;
- evolução mensal;
- comparação entre empresas;
- top variações;
- recorrentes versus não recorrentes.

---

# 16. Importação por Excel

## 16.1 Importadores

Criar importadores separados para:

- pagamentos;
- receitas;
- movimentações;
- extratos;
- orçamento;
- forecast.

## 16.2 Fluxo

1. escolher tipo;
2. selecionar arquivo;
3. ler cabeçalhos;
4. mapear colunas;
5. apresentar prévia;
6. validar;
7. indicar erros;
8. indicar duplicidades;
9. confirmar;
10. registrar lote.

## 16.3 Controle de lote

Campos:

- tipo;
- arquivo;
- usuário;
- data;
- total de linhas;
- válidas;
- rejeitadas;
- duplicadas;
- importadas;
- status.

## 16.4 Duplicidade

Criar chave de prevenção considerando, conforme o módulo:

- empresa;
- conta;
- data;
- valor;
- documento;
- fornecedor ou cliente;
- identificador externo.

## 16.5 Erros

Permitir baixar arquivo com:

- linha original;
- campo;
- erro;
- orientação de correção.

---

# 17. Dashboard executivo

## 17.1 Filtros globais

- período;
- empresa;
- conta;
- realizado ou projetado;
- moeda;
- categoria;
- centro de custo.

## 17.2 Cards

- caixa disponível hoje;
- caixa total com investimentos;
- entradas realizadas;
- saídas realizadas;
- saldo do período;
- entradas projetadas;
- saídas projetadas;
- menor saldo projetado;
- pagamentos vencidos;
- receitas atrasadas;
- pendências de conciliação.

## 17.3 Gráficos

- evolução diária do saldo;
- realizado versus projetado;
- entradas versus saídas;
- projeção de caixa;
- saídas por categoria;
- receitas por natureza;
- posição por empresa;
- posição por banco;
- maiores pagamentos;
- maiores entradas;
- pendências por status.

## 17.4 Drill-down

Todo card e gráfico deve permitir abrir os registros que formam o valor.

Não criar números sem rastreabilidade.

---

# 18. Alertas

Criar estrutura para alertas:

- caixa projetado negativo;
- caixa abaixo do mínimo;
- pagamento vencido;
- receita atrasada;
- conta sem atualização;
- arquivo com erro;
- duplicidade;
- movimentação sem categoria;
- movimentação sem centro de custo;
- pagamento sem nota fiscal;
- conciliação pendente;
- variação relevante;
- concentração de caixa.

Alertas devem aparecer dentro do sistema. E-mail pode ser evolução futura.

---

# 19. Auditoria e histórico

Registrar:

- usuário;
- ação;
- entidade;
- ID do registro;
- data e hora;
- valor anterior;
- valor novo;
- origem;
- IP, se disponível;
- justificativa.

Ações auditáveis:

- criação;
- edição;
- cancelamento;
- exclusão lógica;
- aprovação;
- rejeição;
- importação;
- conciliação;
- desconciliação;
- reprogramação;
- alteração de categoria;
- alteração de centro de custo.

Não realizar exclusão física de movimentações financeiras.

---

# 20. Regras de aprovação

Preparar fluxo configurável.

Exemplo inicial:

- pagamento cadastrado;
- enviado para aprovação;
- aprovado ou rejeitado;
- agendado;
- pago;
- conciliado.

Permitir configuração futura por:

- empresa;
- valor;
- categoria;
- centro de custo;
- usuário;
- nível.

Na primeira versão, implementar ao menos um aprovador.

---

# 21. Layout e identidade visual

Utilizar o arquivo `pagsmile-design-system.html` como referência visual.

## 21.1 Cores principais

- Navy 900: `#00142A`
- Navy principal: `#002443`
- Navy 700: `#00264A`
- Navy 600: `#003566`
- Verde PagSmile: `#2BC196`
- Verde escuro: `#1AA380`
- Mint: `#5CF7CF`
- Fundo principal: `#F4F6F4`
- Fundo secundário: `#ECEFEE`
- Branco: `#FFFFFF`
- Texto principal: `#00142A`
- Texto secundário: `#5B6C7E`

## 21.2 Tipografia

- Fonte principal: Inter
- Fonte monoespaçada: JetBrains Mono

## 21.3 Diretrizes visuais

- aparência corporativa;
- sidebar navy;
- área principal clara;
- verde para ações positivas;
- vermelho apenas para alertas;
- amarelo para atenção;
- bordas suaves;
- cards com sombras discretas;
- radii entre 10px e 16px;
- tabelas densas e legíveis;
- números financeiros com tabular nums;
- responsividade para notebook;
- sem efeitos exagerados;
- sem aparência de landing page.

## 21.4 Estrutura

### Sidebar

- Visão geral
- Cash Flow
- Pagamentos
- Receitas
- Movimentações
- Conciliação
- Investimentos
- FP&A
- Relatórios
- Cadastros
- Configurações

### Topbar

- logo;
- empresa selecionada;
- período;
- busca;
- alertas;
- usuário.

---

# 22. Componentes

Criar componentes reutilizáveis:

- PageHeader
- FilterBar
- FinancialCard
- CurrencyValue
- StatusBadge
- DataTable
- EmptyState
- ErrorState
- LoadingState
- ConfirmDialog
- SidePanel
- FileUploader
- ImportWizard
- AuditTimeline
- AttachmentList
- MoneyInput
- DateInput
- CompanySelector
- BankAccountSelector
- CategorySelector
- CostCenterSelector
- ApprovalTimeline
- ReconciliationMatchCard
- CashFlowMatrix

---

# 23. Stack recomendada

## Front-end

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn/ui ou componentes próprios;
- React Hook Form;
- Zod;
- TanStack Table;
- Recharts.

## Back-end

- Supabase;
- PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Row Level Security;
- Edge Functions quando necessário.

## Utilitários

- SheetJS para XLSX;
- Papa Parse para CSV;
- biblioteca de OFX, se utilizada;
- date-fns;
- decimal.js para cálculos sensíveis.

Não utilizar números de ponto flutuante comuns para armazenar dinheiro.

No banco, utilizar `numeric(18,2)` ou maior conforme necessário.

---

# 24. Modelo de dados sugerido

Criar migrations.

Tabelas sugeridas:

- profiles
- user_company_access
- companies
- bank_accounts
- suppliers
- customers
- cost_centers
- projects
- categories
- subcategories
- transactions
- payments
- payment_realizations
- revenues
- revenue_realizations
- attachments
- approvals
- bank_statement_imports
- bank_statement_entries
- reconciliations
- investments
- transfers
- import_batches
- import_errors
- cashflow_snapshots
- budgets
- budget_lines
- forecasts
- forecast_lines
- audit_logs
- system_settings
- alerts

## 24.1 Tabela transactions

Campos principais:

- id;
- company_id;
- bank_account_id;
- direction;
- temporal_status;
- financial_nature;
- economic_classification;
- category_id;
- subcategory_id;
- cost_center_id;
- project_id;
- counterparty_type;
- counterparty_id;
- description;
- document_number;
- competence_date;
- expected_date;
- realized_date;
- expected_amount;
- realized_amount;
- currency;
- reconciliation_status;
- source_type;
- source_id;
- transfer_group_id;
- intercompany_group_id;
- recurring;
- fixed_variable;
- fpa_classification;
- notes;
- created_by;
- updated_by;
- created_at;
- updated_at;
- deleted_at.

Utilizar enums ou tabelas controladas, conforme melhor arquitetura.

---

# 25. Segurança

Implementar:

- autenticação;
- recuperação de senha;
- RLS;
- acesso por empresa;
- acesso por perfil;
- storage privado;
- links temporários para documentos;
- validação no servidor;
- logs;
- rate limit quando aplicável;
- proteção contra uploads inválidos;
- secrets em variáveis de ambiente.

Nunca expor service role key no front-end.

---

# 26. Requisitos de qualidade

- TypeScript estrito;
- componentes reutilizáveis;
- migrations versionadas;
- dados de demonstração;
- tratamento de erros;
- estados vazios;
- loaders;
- mensagens em português;
- máscaras brasileiras;
- datas em `dd/MM/yyyy`;
- valores em `pt-BR`;
- testes das regras financeiras críticas;
- README de instalação;
- arquivo `.env.example`;
- instruções de deploy.

---

# 27. Critérios de aceite da Fase 1

A Fase 1 estará pronta quando for possível:

1. entrar no sistema;
2. cadastrar empresa;
3. cadastrar conta;
4. cadastrar fornecedor;
5. cadastrar categoria;
6. cadastrar centro de custo;
7. cadastrar um pagamento;
8. anexar nota fiscal;
9. editar o pagamento;
10. aprovar o pagamento;
11. marcar como pago;
12. visualizar a movimentação;
13. filtrar por empresa e período;
14. importar pagamentos por Excel;
15. exportar dados;
16. visualizar dashboard do realizado;
17. consultar histórico de alterações;
18. restringir acesso por perfil.

---

# 28. Critérios de aceite da Fase 2

A Fase 2 estará pronta quando for possível:

1. cadastrar receita estimada;
2. cadastrar despesa prevista;
3. visualizar saldo inicial;
4. visualizar saldo projetado;
5. comparar previsto e realizado;
6. reprogramar uma data;
7. manter histórico;
8. visualizar 7, 15, 30, 60 e 90 dias;
9. abrir a composição dos valores;
10. gerar snapshot.

---

# 29. Critérios de aceite da Fase 3

A Fase 3 estará pronta quando for possível:

1. importar extrato;
2. mapear colunas;
3. identificar duplicidade;
4. sugerir correspondências;
5. conciliar manualmente;
6. conciliar em massa;
7. criar movimento a partir do extrato;
8. desfazer conciliação;
9. visualizar pendências;
10. exportar divergências.

---

# 30. Critérios de aceite da Fase 4

A Fase 4 estará pronta quando for possível:

1. consumir dados realizados;
2. revisar classificações;
3. importar orçamento;
4. importar forecast;
5. comparar realizado;
6. calcular variação;
7. registrar justificativa;
8. analisar por empresa;
9. analisar por centro de custo;
10. exportar relatório.

---

# 31. Ordem de desenvolvimento solicitada

Não começar tudo simultaneamente.

Executar na seguinte ordem:

1. preparar projeto;
2. criar banco e migrations;
3. autenticação;
4. permissões;
5. layout;
6. cadastros;
7. pagamentos;
8. anexos;
9. movimentações;
10. importação;
11. dashboard realizado;
12. receitas;
13. cash flow projetado;
14. investimentos e transferências;
15. conciliação;
16. FP&A.

Ao final de cada etapa:

- executar;
- testar;
- corrigir;
- só então avançar.

---

# 32. Entrega inicial esperada do Claude

Antes de codificar tudo, apresentar:

1. arquitetura;
2. mapa de páginas;
3. modelo de banco;
4. fases;
5. dependências;
6. riscos;
7. premissas;
8. estrutura de pastas.

Depois, iniciar a Fase 1.

Não gerar apenas wireframes.

---

# 33. Premissas assumidas

Para evitar bloqueio:

- moeda inicial BRL;
- idioma português do Brasil;
- timezone `America/Sao_Paulo`;
- uma movimentação pertence a uma empresa;
- uma conta pertence a uma empresa;
- um usuário pode ter acesso a várias empresas;
- documentos ficam privados;
- transferências geram dois movimentos;
- exclusão de dados financeiros é lógica;
- FP&A será construído por último;
- integrações bancárias diretas ficam fora do primeiro ciclo;
- o sistema deve aceitar lançamento manual e Excel.

---

# 34. Itens fora do primeiro ciclo

Não implementar inicialmente:

- execução de Pix ou TED;
- conexão direta com Internet Banking;
- assinatura eletrônica;
- OCR obrigatório;
- contabilização automática;
- integração completa com ERP;
- aplicativo mobile nativo;
- IA generativa para decisões;
- portal externo para fornecedores.

A arquitetura pode ficar preparada, mas essas funcionalidades não devem atrasar as fases principais.

---

# 35. Dados de demonstração

Criar seed com:

- 3 empresas fictícias;
- 5 contas;
- 15 fornecedores;
- 5 clientes;
- categorias operacionais e financeiras;
- 4 centros de custo;
- pagamentos previstos e realizados;
- receitas estimadas e realizadas;
- transferências;
- aplicações;
- pendências de conciliação.

Não utilizar dados reais no código ou repositório.

---

# 36. Resultado esperado

A ferramenta deve deixar de ser uma réplica de Excel e tornar-se uma plataforma interna confiável, rastreável e evolutiva.

Fluxo final:

**Cadastrar ou importar → anexar documento → classificar → aprovar → realizar → visualizar → conciliar → analisar → alimentar FP&A**

Prioridades:

1. integridade do dado;
2. facilidade operacional;
3. rastreabilidade;
4. visão de caixa;
5. conciliação;
6. análise gerencial;
7. estética.

A estética deve apoiar o processo, nunca substituir a funcionalidade.

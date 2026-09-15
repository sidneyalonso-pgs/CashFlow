# Treasury PagSmile — visão geral do sistema

> Documento de referência pra avaliar novas implementações. Reflete o estado do sistema em
> 11/09/2026. Não é uma spec formal — é um mapa de "como as coisas funcionam hoje" pra apoiar
> decisões sobre o que construir a seguir.

## Stack

- **Next.js 14** (App Router, Server Components + Server Actions) + TypeScript + Tailwind
- **Supabase** (Postgres + RLS + Auth)
- **Decimal.js** para todo cálculo monetário (evita erro de ponto flutuante)
- **Vercel** para deploy — build/deploy disparado manualmente via API (o auto-deploy do
  GitHub→Vercel está configurado mas não dispara sozinho)
- Sem CLI de banco no ambiente de dev atual (sem `psql`/Supabase CLI) — mudanças de schema
  exigem rodar a migration manualmente no SQL Editor do Supabase

## Módulos (rotas em `app/src/app/(app)`)

| Módulo | O que faz |
|---|---|
| `cash-flow` | Resumo executivo (por semana/mês/trimestre) + `detalhado` (dia a dia, saldo bancário real vs. projetado) + `detalhe` (drilldown de um período) + `demo` (tela com dados fictícios pra print/divulgação) |
| `pagamentos` | Contas a pagar: lançamento individual (`novo`), em massa (`novo-em-massa`), baixa em massa, fornecedores recorrentes (`recorrentes`), custos fixos (`fixos`) |
| `receitas` | Contas a receber: mesmo padrão de pagamentos — `novo`, `novo-em-massa`, importação Excel |
| `faturamento` | Cobrança de merchants (clientes que usam a PagSmile como processadora): cadastro de clientes/subcontas, emissão de fatura/demonstrativo, baixa, notas de débito, relatório mensal (por competência ou por período de repasse) |
| `transferencias` | Movimentação entre contas bancárias (própria empresa ou intercompany), PIX/TED enviado-recebido |
| `investimentos` | Aplicações e resgates (CDB, etc.) — afeta o saldo em conta E o saldo investido |
| `conciliacao` | Concilia extrato bancário importado com lançamentos do sistema; `intercompany` faz o de-para de transferências entre empresas do grupo |
| `relatorios` | Exportações consolidadas (pagamentos, de-para) |
| `fpa` | Análise financeira (FP&A) |
| `movimentacoes` | Visão consolidada de lançamentos |
| `cadastros` | Empresas, contas bancárias, fornecedores, categorias, centros de custo, plano de contas, projetos |
| `configuracoes` | Usuários, 2FA, senha, auditoria |

## Empresas do grupo (multi-empresa)

O sistema opera para várias pessoas jurídicas do grupo — todo dado tem `company_id`. As
principais hoje: **Pagsmile IP**, **Select Credit**, **Transfersmile Holding**, **Luxpag**. Cada
uma tem suas próprias contas bancárias; transferências entre empresas do grupo (intercompany)
aparecem nos dois lados do Cash Flow quando ligadas por `intercompany_ref`.

## Modelo de dados — tabelas centrais

- **`payments`** / **`revenues`**: lançamento (contas a pagar/receber). Status controla o ciclo:
  `agendado`/`estimada` (provisão) → `pago`/`recebida` (baixado) → opcionalmente `cancelado`.
- **`payment_realizations`** / **`revenue_realizations`**: a *baixa em si* — 1:1 com o
  pagamento/receita (chave única `payment_id`/`revenue_id` desde a migration 0021). É o que
  o Cash Flow soma como "realizado"; enquanto não existe, o lançamento só aparece como
  "provisão" (a pagar/a receber).
- **`bank_accounts`**: `initial_balance` (saldo de abertura), `blocked_balance` (bloqueado, não
  desconta do saldo real), `counts_as_available_cash`.
- **`transfers`**: movimentação entre contas. `from_account_id`/`to_account_id` definem a
  direção real; o campo `tipo` só desempata quando uma ponta é externa (sem conta cadastrada).
- **`investments`**: `tipo` = `aplicacao` (debita C/C, credita posição investida) ou `resgate`
  (o inverso). `is_opening_balance` marca principal pré-existente (não é fluxo de caixa novo).
- **`billing_clients`** / **`billing_subcontas`** / **`billing_invoices`**: faturamento de
  merchants. Modelo de cobrança (`modelo`) decide a fórmula: `mensalidade`/`mensalidade_intro`
  e `bet`/`bets` → PagSmile fica com o valor cheio (`receita = total`, sem repasse);
  `transacao`/`transacao_intro` → `receita = total_faturado - total_repasse` (repassa o resto
  ao merchant).
- **`billing_debit_notes`** (Notas de Débito): puramente documental — sem `revenue_id`/
  `payment_id`, nunca afeta o Cash Flow. Dar baixa nela só muda status/data, sem nenhum
  lançamento de caixa associado.
- **`recurring_payment_templates`**: feature de template recorrente (dia/semana do mês,
  sem valor fixo) — existe no banco e tem wizard de importação, mas a tela
  `/pagamentos/recorrentes` hoje usa outro mecanismo (`payments.recurring = true` +
  `suppliers.recurring_amount`), então os dois sistemas convivem sem estarem conectados.

## Convenções e regras de negócio importantes

- **Provisão vs. realizado**: em todo lugar do sistema, "Entradas/Saídas" = já baixado
  (tem `_realizations`); "A pagar/A receber" = só provisão, nunca conta duas vezes no saldo
  realizado. O saldo projetado soma os dois.
- **Fee-split de faturamento** (`psValues`, duplicado propositalmente em 3 lugares —
  `faturas/`, `relatorio/`, `ExportMonthlyReportButton` — pra manterem-se em sincronia visual):
  `NO_REPASSE_MODELS = [mensalidade, mensalidade_intro, bet, bets]`.
- **`dataOperativa`**: no relatório mensal de faturamento, decide em que mês um lançamento
  "pertence" — usa a data de baixa se já pago, senão o vencimento. Existe um segundo modo,
  **filtro por competência**, pra quando o vencimento cai num mês diferente da competência.
- **Conta padrão por empresa**: Cash Flow pré-seleciona a conta mais usada de cada empresa
  (mapa fixo em `defaultAccount.ts`, não calculado dinamicamente).
- **`transferDirection`**: quem manda é a conta (from/to), o `tipo` só desempata quando uma
  ponta é externa. Transferência interna entre contas da mesma empresa deve gerar entrada E
  saída (se cancelando no saldo) — um bug corrigido recentemente quebrava isso só no cálculo
  do saldo inicial de "todas as contas" do Cash Flow Detalhado.
- **Bulk provisioning de repasses de faturamento (VIDI/SKY/bets) feito manualmente**: quando
  se lança uma provisão manual pra um repasse que ainda não tem fatura real emitida, ela
  convive com o lançamento real que a fatura vai gerar depois — é preciso excluir a manual
  na hora que a fatura de verdade for baixada, pra não contar em dobro. Não há hoje nenhuma
  automação pra isso.

## Bugs recorrentes já corrigidos (histórico, pra não reintroduzir)

1. **Baixa duplicada** (`payment_realizations`/`revenue_realizations`): dois cliques ou duas
   requisições concorrentes em "Dar baixa" conseguiam cada um inserir sua própria linha antes
   que o outro apagasse — dobrava o valor no Cash Flow. Aconteceu com SKY, VIDI TECH, Folha de
   Pagamentos, Prestação de Serviços Jurídicos. **Corrigido**: chave única
   `payment_id`/`revenue_id` no banco (migration 0021) + todo `delete()+insert()` virou
   `upsert(..., { onConflict })`.
2. **Cache da página da fatura não invalidado após baixa**: `baixarFatura` não revalidava
   `/faturamento/[id]`, então quem ficava na tela via "pendente" mesmo já pago e clicava em
   "Dar baixa" de novo — causa direta do bug acima na SKY.
3. **Reagendar fatura não atualizava a data mostrada no documento**: `data_vencimento` mudava
   na fatura, mas `subcontas_detalhe.vencimento` (o que o PDF/tela realmente exibe) ficava
   com a data antiga.
4. **`AutoSubmitForm` resubmete todos os campos juntos**: um `<select>` no valor
   default/"todas as contas" parece escolha deliberada assim que outro campo muda — quebrou a
   lógica de pré-seleção de conta padrão no Cash Flow até usar um campo oculto
   (`prev_company_id`) pra diferenciar "valor herdado" de "escolha explícita".
5. **Saldo inicial negativo em "Todas as contas" no Cash Flow Detalhado**: transferência
   interna entre contas da própria empresa só contava como saída (nunca voltava como entrada)
   no cálculo do saldo anterior ao período — se/senão em vez de somar os dois efeitos.

## Deploy

Sem CLI configurado no ambiente — fluxo manual:
1. `git add` + `git commit` + `git push` (autenticação por token pessoal do GitHub).
2. `POST /v13/deployments` na API da Vercel com o payload salvo (`name`, `project`,
   `target: production`, `gitSource` apontando pro commit no `main`).
3. Poll em `GET /v13/deployments/{id}` até `readyState = READY` (ou `ERROR`, com log via
   `/v2/deployments/{id}/events`).

## Ideias em aberto / pontos de atenção pra novas implementações

- Unificar os dois mecanismos de "pagamento recorrente" (`recurring_payment_templates` vs.
  `payments.recurring` + campos em `suppliers`) — hoje um wizard de importação alimenta uma
  tabela que a tela principal nem lê.
- Um jeito de vincular a provisão manual de repasse de faturamento à fatura real quando ela
  for emitida, pra não depender de exclusão manual.
- `billing_debit_notes` não tem link com `revenue_id`/`payment_id` — se um dia precisar que
  a baixa de uma ND gere lançamento de caixa de verdade, é uma mudança de schema, não só de
  tela.
- Considerar adicionar testes automatizados pros cálculos de Cash Flow (saldo
  inicial/projetado) — os últimos bugs de saldo só foram achados por inspeção manual linha a
  linha, não por teste.

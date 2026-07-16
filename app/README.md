# PagSmile Treasury

Gestão de caixa, pagamentos, receitas e conciliação. Fase 1 (cadastros, pagamentos, movimentações realizadas).

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, RLS).

## Setup — passo a passo (sem Node/Docker local)

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta/organização (se ainda não tiver).
2. Clique em **New project**. Escolha um nome (ex: `pagsmile-treasury`), senha do banco e região `South America (São Paulo)`.
3. Aguarde o provisionamento (1–2 minutos).
4. Vá em **SQL Editor** → **New query**, cole e execute, **nesta ordem**, os arquivos de `supabase/migrations/`:
   `0001_fase1_schema.sql` → `0002_fase1_rls.sql` → `0003_fix_handle_new_user.sql` → `0004_audit_triggers.sql` → `0005_storage_attachments.sql` → `0006_recurring_payments.sql` → `0007_fase2_3_receitas_investimentos_conciliacao.sql`.
6. Vá em **Authentication → Users** e crie seu primeiro usuário (e-mail/senha). Isso cria automaticamente um `profile` com `role = visualizador`.
7. No **SQL Editor**, promova esse usuário a administrador:
   ```sql
   update profiles set role = 'administrador' where id = 'COLE_O_UUID_DO_USUARIO_AQUI';
   ```
   (o UUID aparece na tela de Users)
8. Opcional: rode `supabase/seed.sql` para popular empresas/fornecedores/categorias de demonstração.
9. Vá em **Project Settings → API** e copie a **Project URL** e a **anon public key**.

### 2. Criar o repositório no GitHub

1. Crie um repositório novo (ex: `pagsmile-treasury`), vazio, sem README.
2. Me avise a URL do repositório (`git@github.com:seu-usuario/pagsmile-treasury.git` ou HTTPS) que eu preparo o primeiro commit e peço confirmação antes de dar push.

### 3. Conectar ao Vercel

1. Acesse [vercel.com](https://vercel.com) e crie uma conta (pode usar login com GitHub).
2. **Add New → Project**, selecione o repositório `pagsmile-treasury`.
3. Em **Root Directory**, aponte para `app` (o projeto Next.js fica dentro dessa subpasta).
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (em Supabase: Project Settings → API → **service_role** — nunca expor no front-end, só é usada na rota de cron)
   - `CRON_SECRET` (invente uma string aleatória qualquer, ex: gerada com `openssl rand -hex 32`)
5. Clique em **Deploy**. O Vercel instala dependências e builda o projeto — é lá que erros de tipo/lint vão aparecer, já que não há Node local para testar antes.
6. O arquivo `vercel.json` já configura um **Cron Job** diário (`/api/cron/generate-recurring-payments`, todo dia às 9h UTC ≈ 6h em São Paulo) que gera os lançamentos pendentes dos pagamentos fixos cadastrados em **Pagamentos → Pagamentos fixos**. Cron Jobs só funcionam em produção (não em preview deploys).

### 4. Rodar localmente (quando tiver Node disponível)

```bash
cd app
npm install
cp .env.example .env.local   # preencher com as chaves do Supabase
npm run dev
```

## Estrutura

Ver `../ARQUITETURA.md` na raiz do projeto para o desenho completo (fases, modelo de dados, mapa de páginas).

## Convenções

- Nenhuma exclusão física de dados financeiros — sempre soft delete (`deleted_at`) ou status `cancelado`.
- Valores monetários sempre via `src/lib/calculations/money.ts` (Decimal.js), nunca `number` puro em somas.
- RLS no Postgres é a barreira de segurança real; a UI é só conveniência.

## O que já está construído (Fases 1 a 4, todas em versão funcional)

- **Autenticação e permissões**: login, perfis (`administrador`, `tesouraria`, `aprovador`, `conciliacao`, `fpa`, `visualizador`), acesso por empresa, tela de usuários em Configurações.
- **Cadastros**: empresas, contas bancárias, fornecedores, clientes, categorias, centros de custo, projetos.
- **Pagamentos**: lançamento direto como pago (fornecedor → categoria/centro de custo automáticos, editável) ou programado (futuro), anexos (Storage privado, download via signed URL).
- **Pagamentos fixos**: templates recorrentes sem valor definido — Cron Job diário gera o lançamento pendente no dia do mês configurado; **Baixa em massa** confirma vários de uma vez.
- **Movimentações**: tabela consolidada dos pagamentos com filtros por empresa e período.
- **Importação Excel/CSV**: wizard de pagamentos com prévia, validação linha a linha e relatório de erros.
- **Receitas**: lançamento de receita já recebida ou estimativa futura (com probabilidade ponderada), confirmação de recebimento.
- **Cash Flow**: saldo realizado (inicial + entradas − saídas) e saldo projetado nos horizontes hoje/7/15/30/60/90 dias, considerando pagamentos programados/fixos e receitas estimadas ponderadas.
- **Investimentos**: aplicações financeiras, resgates (parciais ou totais) e posição investida atual.
- **Conciliação bancária**: importação de extrato (Excel/CSV), tela de conciliação manual (escolher qual pagamento/receita corresponde a cada linha do extrato), marcar como ignorado.
- **FP&A**: despesas por categoria, por centro de custo, por classificação FP&A, e receitas por categoria, com filtro de empresa e período — uma DRE gerencial simplificada baseada no realizado.
- **Auditoria**: trigger automático em empresas/contas/fornecedores/pagamentos/baixas/receitas/investimentos + tela de consulta.
- **Relatórios**: exportação de pagamentos em CSV.
- **Dashboard**: caixa disponível, saídas realizadas no mês, pagamentos vencidos.

### Simplificações assumidas (para você indicar ajustes)

- **Conciliação** é manual (você escolhe o lançamento correspondente numa lista) — não há sugestão automática por score de similaridade, nem "dividir"/"agrupar" lançamentos (previstos no briefing original, mas fora do primeiro recorte).
- **Cash Flow**: saldo atual = saldo inicial cadastrado nas contas + todas as entradas realizadas − todas as saídas realizadas (histórico completo), não usa a "data-base do saldo inicial" por conta individualmente. Saldo projetado ainda não gera snapshot diário (previsto no briefing, seção 12.8) para comparar como a previsão evoluiu.
- **FP&A**: mostra o realizado classificado, mas não tem importação de orçamento/forecast nem "realizado vs orçamento" (a fonte disse que só precisa das classificações por enquanto).
- **Investimentos**: resgate não gera automaticamente uma entrada de caixa/receita — só atualiza o saldo do investimento.
- Sem testes automatizados ainda (pedido pela seção 26 do briefing) — recomendo priorizar isso antes de ir para produção.
- Build nunca foi rodado localmente (sem Node neste ambiente) — validado só via build do Vercel. Vale rodar `npm run build` localmente antes de expandir muito mais código, para pegar erros de tipo mais rápido.

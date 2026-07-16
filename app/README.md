# PagSmile Treasury

Gestão de caixa, pagamentos, receitas e conciliação. Fase 1 (cadastros, pagamentos, movimentações realizadas).

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, RLS).

## Setup — passo a passo (sem Node/Docker local)

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta/organização (se ainda não tiver).
2. Clique em **New project**. Escolha um nome (ex: `pagsmile-treasury`), senha do banco e região `South America (São Paulo)`.
3. Aguarde o provisionamento (1–2 minutos).
4. Vá em **SQL Editor** → **New query**, cole e execute, **nesta ordem**, os arquivos de `supabase/migrations/`:
   `0001_fase1_schema.sql` → `0002_fase1_rls.sql` → `0003_fix_handle_new_user.sql` → `0004_audit_triggers.sql` → `0005_storage_attachments.sql`.
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
   (valores copiados no passo 1.9)
5. Clique em **Deploy**. O Vercel instala dependências e builda o projeto — é lá que erros de tipo/lint vão aparecer, já que não há Node local para testar antes.

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

## O que já está construído (Fase 1 completa + esqueleto das próximas fases)

- **Autenticação e permissões**: login, perfis (`administrador`, `tesouraria`, `aprovador`, `conciliacao`, `fpa`, `visualizador`), acesso por empresa, tela de usuários em Configurações.
- **Cadastros**: empresas, contas bancárias, fornecedores, categorias, centros de custo, projetos — todos com listagem + criação.
- **Pagamentos**: criação, envio para aprovação, aprovar/rejeitar/devolver, registro de baixa (parcial ou total), anexos (Storage privado com download via signed URL), histórico de aprovação.
- **Movimentações**: tabela consolidada dos pagamentos com filtros por empresa e período.
- **Importação Excel/CSV**: wizard de pagamentos com prévia, validação linha a linha e relatório de erros.
- **Auditoria**: trigger automático em empresas/contas/fornecedores/pagamentos/baixas + tela de consulta.
- **Relatórios**: exportação de pagamentos em CSV.
- **Dashboard**: caixa disponível, saídas realizadas no mês, pagamentos vencidos (calculado por `due_date`, não depende de job agendado).

### Simplificações assumidas nesta entrega (para ajuste posterior)

- **Receitas, Cash Flow projetado, Investimentos, Conciliação e FP&A** são só placeholders ("em construção") — são Fases 2, 2, 2, 3 e 4 do briefing, respectivamente. As páginas existem para a navegação não quebrar, mas sem funcionalidade ainda.
- **Caixa disponível** no dashboard soma apenas o `initial_balance` das contas — ainda não desconta as baixas de pagamento realizadas (isso deveria virar uma view ou cálculo mais completo).
- **Movimentações** mostra só pagamentos (saídas); quando o módulo de receitas existir, precisa unificar as duas fontes.
- Sem testes automatizados ainda (pedido pela seção 26 do briefing) — recomendo priorizar isso antes de ir para produção.
- Build nunca foi rodado localmente (sem Node neste ambiente) — validado só via build do Vercel. Vale rodar `npm run build` localmente antes de expandir muito mais código, para pegar erros de tipo mais rápido.

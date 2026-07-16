# PagSmile Treasury — Proposta de Arquitetura (Entrega Inicial)

> Referência: `Briefing_Claude_CashFlow_Tesouraria_PagSmile.md`, seção 32.

---

## 1. Arquitetura

**Modelo**: aplicação web full-stack, Next.js (App Router) no front-end e Supabase (Postgres + Auth + Storage + RLS) no back-end.

```
Browser (Next.js/React)
   │  Server Components + Server Actions
   ▼
Next.js Server (API routes / Server Actions)
   │  supabase-js (service role apenas no servidor)
   ▼
Supabase
   ├─ PostgreSQL (dados financeiros, RLS por empresa/perfil)
   ├─ Auth (autenticação + sessão)
   ├─ Storage (notas fiscais, extratos — buckets privados)
   └─ Edge Functions (jobs: snapshot diário, importação pesada)
```

Princípios aplicados:
- Banco como fonte única da verdade (dashboards leem das mesmas tabelas).
- RLS garante isolamento por empresa e por perfil diretamente no Postgres (não confiar apenas na UI).
- `service_role` key nunca chega ao front-end — só em Server Actions/Edge Functions.
- Cálculos monetários com `numeric(18,2)` no banco e `decimal.js` no client.

## 2. Mapa de páginas (Fase 1 em diante)

```
/login
/                          → Visão geral (dashboard executivo)
/cash-flow                 → Matriz de cash flow (Fase 2)
/pagamentos
/pagamentos/[id]
/pagamentos/novo
/receitas                  → (Fase 2)
/movimentacoes             → tabela geral
/movimentacoes/[id]
/conciliacao               → (Fase 3)
/investimentos             → (Fase 2/3)
/fpa                       → (Fase 4)
/relatorios
/cadastros/empresas
/cadastros/contas-bancarias
/cadastros/fornecedores
/cadastros/clientes
/cadastros/categorias
/cadastros/centros-de-custo
/cadastros/projetos
/configuracoes
/configuracoes/usuarios
/importacao/[tipo]         → wizard genérico (pagamentos, receitas, movimentações, extratos)
```

## 3. Modelo de banco (Fase 1)

Tabelas da Fase 1 (subconjunto da seção 24 do briefing — o restante entra nas fases seguintes):

- `profiles` (estende `auth.users`: nome, perfil/role)
- `user_company_access` (user_id, company_id, role)
- `companies`
- `bank_accounts`
- `suppliers`
- `customers`
- `cost_centers`
- `projects`
- `categories` / `subcategories`
- `payments` / `payment_realizations`
- `attachments`
- `approvals`
- `transactions` (visão consolidada realizada, alimentada por payments/revenues)
- `import_batches` / `import_errors`
- `audit_logs`

Todas as tabelas financeiras usam **soft delete** (`deleted_at`), nunca DELETE físico. RLS baseada em `user_company_access`.

## 4. Fases (recapitulando ordem de execução, seção 31)

1. Setup do projeto (Next.js + Supabase local via CLI)
2. Banco e migrations (Fase 1)
3. Autenticação (Supabase Auth)
4. Permissões (RLS + perfis)
5. Layout (sidebar/topbar com design system)
6. Cadastros (empresas, contas, fornecedores, categorias, centros de custo, projetos)
7. Pagamentos (CRUD + status + aprovação)
8. Anexos (Storage privado)
9. Movimentações (tabela geral)
10. Importação Excel (pagamentos)
11. Dashboard do realizado
12. → Fases 2, 3, 4 em documentos de arquitetura próprios quando chegarem

## 5. Dependências

- Node.js LTS, Docker Desktop (para Supabase local via CLI)
- Supabase CLI
- Pacotes: next, react, typescript, tailwindcss, @supabase/supabase-js, @supabase/ssr, react-hook-form, zod, @tanstack/react-table, recharts, xlsx (SheetJS), papaparse, date-fns, decimal.js

## 6. Riscos

- **Precisão monetária**: mitigado com `numeric` no banco e `decimal.js` no client; nunca `number` puro para somas de dinheiro.
- **RLS mal configurada** pode vazar dados entre empresas — testar com usuários de teste em cada perfil antes de avançar de fase.
- **Importação Excel** com planilhas fora do padrão — mapeamento de colunas configurável mitiga, mas exige validação robusta linha a linha.
- **Escopo grande**: risco de tentar construir tudo de uma vez — mitigado seguindo estritamente a ordem da seção 31 do briefing.

## 7. Premissas

Conforme seção 33 do briefing: BRL, pt-BR, timezone `America/Sao_Paulo`, uma movimentação/conta por empresa, usuário pode acessar várias empresas, documentos privados, exclusão lógica, FP&A por último.

## 8. Estrutura de pastas

```
Kit_Claude_CashFlow_Tesouraria_PagSmile/
├── Briefing_Claude_CashFlow_Tesouraria_PagSmile.md
├── ARQUITETURA.md
├── pagsmile-design-system.html
├── pagsmile-logo-navy.png
├── pagsmile-logo-transparent.png
└── app/                              (projeto Next.js — criado a seguir)
    ├── src/
    │   ├── app/                      (rotas App Router, conforme mapa acima)
    │   ├── components/               (PageHeader, FilterBar, DataTable, etc.)
    │   ├── lib/
    │   │   ├── supabase/             (clients server/browser)
    │   │   ├── calculations/         (decimal.js helpers)
    │   │   └── validators/           (schemas Zod)
    │   ├── types/
    │   └── hooks/
    ├── supabase/
    │   ├── migrations/
    │   └── seed.sql
    ├── public/
    │   └── logos/
    ├── .env.example
    └── README.md
```

Todo o projeto de código (`app/`) fica **dentro desta pasta**, isolado de qualquer outro projeto.

---

**Próximo passo**: iniciar Fase 1 — setup do projeto Next.js + Supabase local.

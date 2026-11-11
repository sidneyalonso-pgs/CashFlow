# Treasury PagSmile — Design System e premissas de layout

> Referência para estender o visual do Treasury ao **Price Core**.
> Tudo aqui foi extraído do código (`app/tailwind.config.ts`, `app/src/app/globals.css`, `app/src/components/*`, telas em `app/src/app/(app)/*`). Onde algo é convenção deduzida do uso (e não uma regra escrita no código), está marcado como **(convenção)**.

---

## 1. Stack visual

| Item | Escolha |
|---|---|
| Framework | Next.js 14 (App Router) + React + TypeScript |
| Estilo | **Tailwind CSS** com tokens próprios; sem biblioteca de componentes (tudo é componente local) |
| Fontes | **Plus Jakarta Sans** (app logado) · **Inter** (login, documentos, fallback) · **JetBrains Mono** (rótulos técnicos, ex.: "TREASURY" no menu) |
| Ícones | SVG inline, traço 1.6, `stroke="currentColor"`, 20×20 (`w-5 h-5`), sem biblioteca |
| Idioma | pt-BR em toda a interface |
| Logos | `/public/logos/` — `pagsmile-logo-transparent.png` (sobre fundo escuro), `pagsmile-logo-navy.png` (sobre fundo claro), `pagsmile-ip-logo.png` |

Fontes carregadas via Google Fonts em `globals.css`: Inter 400–800, Plus Jakarta Sans 300–800, JetBrains Mono 400–600.

---

## 2. Tokens de cor

As cores são **variáveis CSS com canais RGB** (`rgb(var(--ps-x) / <alpha-value>)`), para permitir trocar o tema por escopo e usar opacidade do Tailwind (`bg-ps-navy/5`, `text-white/60`).

### 2.1 Três escopos de tema (premissa central)

O mesmo nome de token muda de valor conforme a classe do contêiner:

| Escopo | Onde vale | Característica |
|---|---|---|
| `:root` | Login, tudo fora do app logado | Azul-marinho original PagSmile (`navy-900` = `0 20 42`) |
| `.app-shell` | **Todo o app logado** (intranet) | **Verde-floresta + menta**; fonte Plus Jakarta Sans |
| `.doc-navy` | Faturas, notas de débito, relatórios que **saem para o cliente** | Volta à paleta marinho + Inter, mesmo dentro do app |

> **Regra:** o que o cliente final vê (documento enviado) nunca usa o verde da intranet — usa `.doc-navy`. O que a equipe interna vê usa `.app-shell`.

### 2.2 Valores (canais RGB)

| Token | `.app-shell` (intranet) | `:root` / `.doc-navy` (marinho) | Uso |
|---|---|---|---|
| `ps-navy-900` | `15 47 42` | `0 20 42` | Texto sobre menta, fundos mais escuros |
| `ps-navy-800` | `20 60 54` | `0 27 53` | — |
| `ps-navy-700` | `38 95 86` | `0 38 74` | Hover de botão escuro |
| `ps-navy-600` | `46 107 97` | `0 53 102` | — |
| `ps-navy` | `29 75 68` | `0 36 67` | **Cor-base escura**: menu lateral, faixa do topo, botão primário escuro |
| `ps-navy-50` | `231 240 238` | `232 238 245` | Tinta clara |
| `ps-mint` / `ps-green-300` | `125 240 190` | `92 247 207` | **Destaque**: item ativo do menu, palavra final do título, avatar |
| `ps-green-200` | `201 248 227` | `182 252 230` | Fundo de badge positivo |
| `ps-bg` | `243 246 249` | `244 246 244` | Fundo da área de conteúdo |
| `ps-bg-2` | `233 238 242` | `236 239 238` | Cabeçalho de tabela, hover de linha, campos desabilitados |
| `ps-ink` | `18 54 47` | `0 20 42` | Texto principal |
| `ps-ink-2` | `37 69 63` | `31 45 63` | Texto secundário, rótulos de campo |
| `ps-muted` | `95 115 128` | `91 108 126` | Legendas, cabeçalhos de tabela, dicas |

### 2.3 Cores fixas (não mudam com o tema)

| Token | Hex | Uso |
|---|---|---|
| `ps-green` | `#2BC196` | **Botão de ação principal**, foco de campo, positivo |
| `ps-green-600` | `#20B389` | Variação |
| `ps-green-700` | `#1AA380` | Texto positivo (valores, badges) |
| `ps-muted-2` | `#8294A6` | Texto terciário |

### 2.4 Cores semânticas (paleta padrão do Tailwind)

Por uso real no código (contagem aproximada de ocorrências):

| Significado | Classes | Onde |
|---|---|---|
| **Negativo / erro / vencido** | `text-red-600` (mais usada), `text-red-700`, `bg-red-50`, `bg-red-100` | Saídas, saldo negativo, divergência, ação destrutiva |
| **Atenção / pendente** | `text-amber-700`, `bg-amber-50`, `text-yellow-800`, `bg-yellow-100` | Pendente de aprovação, parcial, avisos |
| **Positivo / ok** | `text-ps-green-700`, `bg-ps-green-200`, `text-green-700`, `bg-green-50` | Pago, recebido, conciliado |
| **Informativo / previsto** | `text-blue-700`, `bg-blue-100` | Agendado, estimado, provisionado |
| **Inativo / cancelado** | `bg-gray-100`, `text-gray-500` | Cancelado, ignorado, inativo |

> **Regra:** cor semântica é separada da cor de marca. Verde de marca (`ps-green`) é botão/foco; verde de status é `ps-green-700` sobre `ps-green-200`.

---

## 3. Tipografia

| Elemento | Classes |
|---|---|
| Título de página | `text-2xl font-light tracking-tight text-white` (sobre a faixa verde) |
| Palavra final do título | `text-ps-mint font-medium` (ver §5.1) |
| Subtítulo de página | `text-sm text-white/70 mt-1` |
| Título de modal / diálogo | `text-lg font-bold` / `text-base font-bold` `text-ps-ink` |
| Valor de cartão (KPI) | `text-2xl font-bold tabular-nums` |
| Rótulo de cartão / seção | `text-[11px] uppercase tracking-[0.12em] text-ps-muted font-medium` |
| Rótulo pequeno em maiúsculas | `text-[10px] uppercase tracking-widest font-semibold` |
| Cabeçalho de tabela | `text-xs uppercase tracking-wide text-ps-muted` |
| Corpo / células | `text-sm` |
| Rótulo de campo | `text-sm text-ps-ink-2` |
| Rótulo de seção do menu | `text-xs font-medium uppercase tracking-[0.12em] text-ps-green-300/70` |
| Legenda / dica | `text-xs text-ps-muted` |

**Premissas tipográficas**
- **Números sempre `tabular-nums`** (colunas de valor alinham os dígitos).
- Títulos **leves** (`font-light`) e **valores pesados** (`font-bold`): o contraste de peso é o que dá hierarquia, não o tamanho.
- Maiúsculas só em rótulos pequenos e sempre com `tracking-` aberto.
- Texto `font-mono` só para marca técnica (ex.: "TREASURY" com `tracking-[0.2em]`).

---

## 4. Forma, sombra e espaçamento

### 4.1 Raios

| Token | Valor | Uso |
|---|---|---|
| `rounded-ps-sm` | 12px | Campos, selects, botões secundários, chips internos |
| `rounded-ps` | 20px | **Cartões, tabelas, modais** |
| `rounded-ps-lg` | 28px | Cartão de login |
| `rounded-full` | — | **Botões primários, itens do menu, badges, avatar** (formato "pílula") |
| `rounded-tl-[24px]` | 24px | Canto superior esquerdo da área de conteúdo (ver §5) |

> **Regra:** ações são **pílulas** (`rounded-full`); superfícies são **cartões de 20px**; campos de formulário são **12px**. Não misturar.

### 4.2 Sombras

| Token | Uso |
|---|---|
| `shadow-ps-sm` | Cartões e tabelas em repouso |
| `shadow-ps` | Hover de cartão |
| `shadow-ps-lg` | Modais |

Sempre com a tinta marinho em baixa opacidade (`rgba(0, 20, 42, 0.04–0.06)`): sombra suave, nunca preta pura.

### 4.3 Superfície padrão (cartão)

```
bg-white rounded-ps shadow-ps-sm border border-ps-navy/5 p-5
```
É a classe mais repetida do sistema. Variações: `p-4` (denso), `p-5 space-y-4` (formulário), `overflow-hidden overflow-x-auto` (tabela).
**Borda = `ps-navy` a 5% de opacidade** (separador quase invisível); divisórias internas usam `border-ps-navy/5` ou `/[0.06]`.

### 4.4 Espaçamento
- Padding da área de conteúdo: `p-8`.
- Espaço vertical entre blocos de uma tela: `space-y-3` (denso) · `space-y-4` · `space-y-6` (padrão para seções).
- Grade de KPIs: `grid grid-cols-2 lg:grid-cols-4 gap-4`.
- Filtros: `flex flex-wrap gap-3 mb-4`.

---

## 5. Estrutura da tela (o "shell")

```
┌───────────┬───────────────────────────────────────────┐
│           │  faixa verde (ps-navy) — título + ações    │  ← PageHeader
│  MENU     │  ╭────────────────────────────────────────  │
│  verde    │  │  área clara (ps-bg), canto sup.-esq.     │
│  (ps-navy)│  │  arredondado 24px  — conteúdo            │
│  w-64     │  │                                          │
└───────────┴───────────────────────────────────────────┘
```

`app/(app)/layout.tsx`:
```tsx
<div className="app-shell flex min-h-screen bg-ps-bg">
  <Sidebar role={...} />
  <div className="flex-1 flex flex-col bg-ps-navy min-w-0">
    <Topbar ... />
    <main className="flex-1 p-8 bg-ps-bg rounded-tl-[24px]">{children}</main>
  </div>
</div>
```

**Ideia visual central:** a coluna da direita é verde; o `<main>` claro é uma "folha" por cima, com **só o canto superior esquerdo arredondado**. O verde do menu e o verde do topo formam uma só moldura em "L".

### 5.1 PageHeader (cabeçalho de página)
- Vive **dentro da faixa verde**: sobe cancelando o padding do `main` (`-mx-8 -mt-8`), altura mínima 132px (alinha com a logo do menu).
- Compõe: `BackLink` (←) + título + subtítulo à esquerda; ações à direita.
- **Título:** a **última palavra** vai em menta (`text-ps-mint font-medium`). Ex.: "Posição **Executiva**", "Central **Piloto**". Isso é automático no componente — não colorir à mão.
- **Ações no verde:** qualquer botão/link filho vira **contorno translúcido** (`bg-white/10`, borda `white/30`, pílula) por CSS forçado no contêiner, qualquer que seja o estilo de origem.
- Termina com uma faixa `h-4 bg-ps-bg rounded-tl-[24px]` que faz a transição para a folha clara.
- Ações têm `mt-14` para nunca ficarem sob o usuário (canto superior direito).
- Em impressão: fundo transparente, título em `ps-ink`, ações ocultas.

### 5.2 Topbar
- **Sem altura própria** (`h-0`): só hospeda o usuário, posicionado absoluto (`top-6 right-8`).
- Pílula `bg-ps-navy` com: avatar de iniciais (círculo menta, `w-10 h-10`, anel `ring-white/25`), nome, divisor vertical, botão de sair.
- Iniciais: primeira letra do primeiro + última palavra do nome.

### 5.3 Sidebar
- Fundo `ps-navy`, texto branco, `w-64` (recolhido: `w-16`). Estado recolhido salvo em `localStorage` (`ps-sidebar-collapsed`).
- Topo de 132px com logo + "TREASURY" em mono e brilho verde difuso (`blur-3xl`) no canto.
- **Seções com rótulo** em maiúsculas menta a 70%: (sem rótulo) · Operações · Faturamento · Financeiro · Análise · Sistema.
- **Item:** pílula (`rounded-full px-3.5 py-2.5 text-[15px]`).
  - Inativo: `text-white/70`, hover `bg-white/5 text-white`.
  - **Ativo: `bg-ps-mint text-ps-navy-900 font-semibold`.**
- Recolhido: só ícone centralizado + `title` com o rótulo.
- **Item ativo = rota mais específica**: se `/faturamento` e `/faturamento/notas-debito` existem, só o mais específico acende.
- **Menu por papel:** `diretoria` vê só "Visão geral"; `piloto` só "Central Piloto". **Esconder item não é controle de acesso** — o bloqueio real está no `middleware.ts`.

### 5.4 BackLink
- "← Rótulo" no topo do título, derivado da URL (sobe um nível). Tela nova nasce com "voltar" funcionando; rótulos amigáveis num mapa, senão humaniza o segmento.
- Estilo: `text-xs text-white/60 hover:text-ps-mint`.

---

## 6. Biblioteca de componentes

| Componente | Função | Pontos-chave |
|---|---|---|
| `PageHeader` | Cabeçalho na faixa verde | título com última palavra em menta; `actions` |
| `FinancialCard` | KPI | rótulo pequeno + valor `2xl bold`; **barra de 4px à esquerda** na cor do tom (`positive` verde, `negative` vermelho, neutro `navy/20`); `hint` opcional |
| `DataTable` | Tabela | cabeçalho `bg-ps-bg-2` em maiúsculas; linha `border-t border-ps-navy/5`, hover `bg-ps-bg-2/60`; `whitespace-nowrap`; vazio: "Nenhum registro encontrado."; linha-alvo de âncora destacada em amarelo |
| `ExpandableTable` | Tabela com linhas expansíveis | — |
| `StatusBadge` | Status em pílula | `px-2.5 py-1 rounded-full text-xs font-medium`; mapa status→cor e status→rótulo PT-BR (ver §7) |
| `TextField / SelectField / CheckboxField` | Campos | `h-11 rounded-ps-sm border border-ps-navy/15 px-3 text-sm`; foco `ring-2 ring-ps-green border-ps-green`; checkbox `accent-ps-green` |
| `Modal` | Diálogo | `max-w-md`, `rounded-ps shadow-ps-lg p-6`; fundo `ps-navy-900/50 backdrop-blur-[2px]`; entrada animada |
| `ConfirmDialog` | Confirmação | ícone circular de alerta; `tone` `danger` (vermelho) ou `warning` (âmbar); foco no botão de confirmar; **Esc cancela**; clique fora cancela; rodapé `bg-ps-bg-2/60` |
| `CollapsiblePanel` | Painel recolhível | título em maiúsculas pequenas, seta `›` que gira |
| `AutoSubmitForm` | Filtros | formulário que submete ao mudar um campo (filtros por URL, sem botão "Buscar") |
| `Skeleton` | Carregamento | `CardsSkeleton`, `TabelaSkeleton`, `PaginaSkeleton` — barras `bg-ps-navy/[0.07] animate-pulse`, no formato da tela real; `aria-busy` + texto `sr-only` |
| `Portal` | Camada de modais | renderiza fora da árvore |
| `Sidebar / Topbar / BackLink` | Navegação | ver §5 |

---

## 7. Botões

| Tipo | Classes | Quando |
|---|---|---|
| **Primário (verde de marca)** | `bg-ps-green text-ps-navy-900 font-semibold rounded-full px-4 py-2 text-sm disabled:opacity-60` | Ação principal de formulário (Salvar, Emitir, Confirmar) |
| **Primário escuro** | `bg-ps-navy text-white text-sm font-medium rounded-full px-4 py-2 hover:bg-ps-navy-700 transition-colors` | Ação principal em lista/cabeçalho ("Nova receita") |
| **Secundário** | `bg-white border border-ps-navy/15 text-ps-ink text-sm font-medium rounded-ps-sm px-4 py-2 hover:bg-ps-bg-2 transition-colors` | Importar, Lançar em massa, Cancelar |
| **Link discreto** | `text-sm text-ps-muted underline` | "Limpar" filtros |
| **Destrutivo** | `bg-red-600 hover:bg-red-700` (no `ConfirmDialog`) | Excluir |
| **No verde (cabeçalho)** | automático via `PageHeader` | Qualquer ação no topo |

**Premissas**
- Máximo **um** botão primário por região; o resto é secundário.
- Primário = pílula; secundário = 12px. Desabilitado = `opacity-60`, nunca some.
- Largura total (`w-full`) só em cartões estreitos/login.

---

## 8. Status (mapa padrão)

`StatusBadge` mapeia a chave técnica (snake_case) → rótulo PT-BR + cor:

| Família | Chave → cor |
|---|---|
| **Concluído** | `pago`, `recebida`, `aprovado`, `ativo`, `conciliado_*` → verde (`ps-green-200` / `ps-green-700`) |
| **Previsto** | `agendado`, `provisionado`, `estimada`, `confirmada`, `sugestao_encontrada` → azul |
| **Atenção** | `pago_parcialmente`, `parcialmente_recebida`, `reprogramada`, `pendente_aprovacao`, `parcialmente_resgatado` → amarelo |
| **Atraso / erro** | `vencido`, `atrasada`, `rejeitado`, `divergente` → vermelho |
| **Em aberto** | `em_aberto` → laranja |
| **Neutro / encerrado** | `rascunho`, `pendente`, `cancelado`, `cancelada`, `inativo`, `ignorado`, `resgatado` → cinza |

> **Regra:** status desconhecido cai em cinza com a própria chave como rótulo — nunca quebra a tela. **Estado é codificado em forma + cor** (pílula colorida), nunca só em número.

---

## 9. Padrões de tela

1. **Lista:** `PageHeader` (título + ações) → faixa de filtros (`AutoSubmitForm`, selects/datas de 12px, "Limpar") → `DataTable`. Cabeçalhos ordenáveis via `SortLink`.
2. **Painel/Resumo:** `PageHeader` → grade de `FinancialCard` (2 col. no mobile, 4 no desktop) → tabelas/painéis recolhíveis.
3. **Formulário:** cartão `p-5 space-y-4`, campos em grade; botão primário verde ao fim; erros em vermelho próximos ao campo.
4. **Detalhe/Documento:** cabeçalho com BackLink + corpo em cartões; versão imprimível em rota `(print)`.
5. **Carregamento:** `loading.tsx` no grupo `(app)` com o `PaginaSkeleton` (e `CardsSkeleton`/`TabelaSkeleton` avulsos onde couber), no formato da tela final. Telas que puxam muitos dados **precisam** mostrar que estão carregando (**convenção:** criar um `loading.tsx` próprio nas telas pesadas).
6. **Confirmação destrutiva:** sempre `ConfirmDialog` com `detail` mostrando o item afetado; nunca `window.confirm`.
7. **Erro de rota:** `error.tsx` no grupo `(app)`.

---

## 10. Formatação de dados (premissas)

- **Moeda:** `formatBRL` → `R$ 1.234,56` (`toLocaleString("pt-BR", {style:"currency", currency:"BRL"})`).
- **Compacto (camada executiva):** `R$ 1,25 mi`, `R$ 580 mil`; valor cheio fica na tabela. Negativo com **sinal tipográfico "−"** (não hífen).
- **Data:** `dd/mm/aaaa` na tela; ISO `aaaa-mm-dd` no banco. Cuidado com fuso: o servidor roda em UTC e "hoje" é calculado em Brasília (UTC−3) quando importa.
- **Valores negativos / saídas:** `text-red-600`; **positivos:** `text-ps-green-700`.
- **Colunas numéricas:** alinhadas à direita, `tabular-nums`.
- **Vazio:** traço `—`; nunca "null" ou campo em branco.
- **Empresa:** `trade_name || legal_name || "—"` (`companyLabel`).

---

## 11. Movimento e acessibilidade

- Animações **curtas e funcionais**: modal (`0.2s`, sobe 8px + escala 0.98→1), fundo (`0.15s`), hover de cartão (sombra), pulso de skeleton.
- **`prefers-reduced-motion: reduce`** desliga as animações de modal, login e fundo.
- Foco visível: `focus:ring-2 focus:ring-ps-green` em campos; `focus-visible:ring-2` em botões/links.
- Diálogos: `role="dialog"`, `aria-modal`, `aria-labelledby`; ícones decorativos `aria-hidden`; botão de fechar com `aria-label`.
- Skeleton com `aria-busy` + texto para leitor de tela.

---

## 12. Impressão e documentos

- Rota de impressão separada: `app/(print)/layout.tsx`.
- **Documentos enviados a cliente** (`InvoiceDoc`, `NDDoc`, relatórios): escopo **`.doc-navy`** (marinho + Inter), nunca o verde da intranet.
- Em `print`: cabeçalho sem fundo, ações e Topbar ocultas (`print:hidden`), título em `ps-ink`.
- O repasse ao parceiro é interno e **não aparece** no documento do cliente.

---

## 13. Login (única tela fora do app-shell)

- Fundo marinho em gradiente radial (`#00335c → #002443 → #00142a`) com **linhas de ícones rolando** (opacidade 10–16%, cor menta `#5cf7cf`), dois "brilhos" borrados (verde `#2bc196` e azul `#00567a`) que derivam lentamente e vinheta.
- Cartão branco translúcido `max-w-[420px] rounded-ps-lg`, logo navy, título "Treasury", subtítulo "Gestão de caixa, pagamentos e conciliação".
- Em telas largas o cartão fica à direita (`justify-end`, `padding-right: 8vw`).
- Botão: gradiente `#2bc196 → #1aa380` com sombra verde; sobe 1px no hover.
- Campo com foco: borda `#2bc196` + anel `rgba(43,193,150,.18)`.
- Cartão treme se a senha falhar (`login-card--shake`).
- **MFA obrigatório** (TOTP): sem fator verificado o app logado redireciona para o login.

---

## 14. Acesso e navegação (premissas de produto)

- Autenticação Supabase Auth + **MFA TOTP obrigatório**.
- Papéis em `profiles.role`: `administrador` (tudo), `diretoria` (só Posição Executiva), `piloto` (só Central Piloto).
- **O menu reflete o papel, mas quem barra é o middleware** — nunca confiar em esconder item.
- Auditoria: `audit_logs` (valor anterior/novo) com gatilhos nas tabelas financeiras e, desde a migração `0036`, nas tarifas de faturamento.

---

## 15. Convenções de código visual

- Componentes de UI em `src/components/`; nada de estilo duplicado em tela — se repetiu 3 vezes, vira componente.
- **Sem cores hexadecimais soltas** na UI logada: sempre token (`ps-*`) ou cor semântica Tailwind. (Hex só no login, que é o único cenário com gradiente próprio.)
- Valores monetários e datas **sempre** via helpers (`formatBRL`, `dataBR`), nunca `toFixed` solto.
- Texto de interface em pt-BR, tom direto, ação no verbo ("Emitir fatura", "Nova receita").
- Estado de carregamento, vazio e erro **são parte da tela**, não opcionais.

---

## 16. Checklist para estender ao Price Core

**Copiar como está**
1. `tailwind.config.ts` (tokens `ps-*`, raios `ps`, `ps-sm`, `ps-lg`, sombras) e o bloco de variáveis de `globals.css`.
2. Os três escopos de tema (`:root`, `.app-shell`, `.doc-navy`).
3. Shell: `Sidebar` + `Topbar` + `main` com `rounded-tl-[24px]` + `PageHeader`.
4. Componentes: `FinancialCard`, `DataTable`, `StatusBadge`, `FormField`, `Modal`, `ConfirmDialog`, `CollapsiblePanel`, `Skeleton`, `BackLink`, `AutoSubmitForm`.
5. Fontes (Plus Jakarta Sans no app, Inter nos documentos) e o set de ícones SVG inline.

**Decidir para o Price Core**
- **Diferenciar do Treasury?** Hoje a identidade do app logado é o verde-floresta. Se o Price Core precisa ser reconhecível como outro módulo, o caminho barato é um **quarto escopo** (ex.: `.app-shell-price`) que só redefine os canais `--ps-navy-*`, `--ps-mint` e `--ps-ink*` — os componentes não mudam, só a paleta. Sem isso, os dois serão visualmente idênticos.
- **Mapa de status próprio:** `StatusBadge` é do domínio financeiro (pago, vencido, conciliado…). O Price Core precisará de suas próprias chaves (ex.: vigente, expirado, em revisão) — manter a mesma regra de cor por família (§8) e o fallback cinza.
- **Itens de menu e seções:** definir as seções (`NAV_SECTIONS`) e os papéis que as enxergam; lembrar de replicar a barreira no middleware.
- **Números de preço:** o Treasury usa 2 casas; preços unitários/tarifas aparecem com 4 casas (ex.: `0,0450`). Definir o helper de formatação com casas configuráveis, mantendo `tabular-nums` e alinhamento à direita.
- **Documentos externos** (tabela de preços, proposta): usar `.doc-navy`, nunca o verde da intranet.

**Não levar**
- Fundo animado do login (específico do Treasury).
- Regras de negócio embutidas em componentes de tela (repasse, fee-split, provisão vs. realizado).

---

### Apêndice — referências no código

| O quê | Onde |
|---|---|
| Tokens e escopos de tema | `app/src/app/globals.css`, `app/tailwind.config.ts` |
| Shell | `app/src/app/(app)/layout.tsx` |
| Menu | `app/src/components/Sidebar.tsx` (`NAV_SECTIONS`) |
| Cabeçalho | `app/src/components/PageHeader.tsx`, `Topbar.tsx`, `BackLink.tsx` |
| Componentes | `app/src/components/*` |
| Moeda | `app/src/lib/calculations/money.ts` (`formatBRL`) |
| Controle de acesso | `app/src/middleware.ts` |
| Auditoria | `app/supabase/migrations/0004_audit_triggers.sql`, `0036_audit_tarifas.sql` |
| Design system HTML original | listado em `ARQUITETURA.md` (`pagsmile-design-system.html`) |

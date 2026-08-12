# Pé-de-meia — Documento de Produto

> Controle de caixa pessoal inspirado em planilha financeira diária, com visão operacional (saldos), analítica (totais), estratégica (horizonte) e SaaS.

**Versão:** 1.0  
**Data:** agosto/2026  
**Branch de referência:** `cursor/design-system`

---

## 1. Visão

### 1.1 Problema

Pessoas que controlam finanças no dia a dia precisam responder, rapidamente:

- Quanto tenho **hoje**?
- Quanto posso gastar **por dia** este mês?
- Vou ficar **no vermelho** nos próximos meses?
- Onde foi meu dinheiro (**entradas vs saídas vs cartão vs economias**)?

Planilhas funcionam, mas são manuais. Calendários genéricos mostram eventos, mas não **saldo acumulado** nem **KPIs mensais**.

### 1.2 Proposta

**Pé-de-meia** é um app web de finanças pessoais centrado em:

1. **Planilha diária (Saldos)** — uma linha por dia, colunas por tipo de movimento, saldo running com heatmap.
2. **Dashboard mensal (Totais)** — performance, economia, custo de vida, diário médio.
3. **Projeção (Horizonte)** — saldo projetado dia a dia por vários meses.
4. **Previsão de diário** — teto diário calculado a partir de gastos fixos mensais.

O **calendário** permanece como visão alternativa (já implementado).

### 1.3 Inspiração (referência visual)

| Módulo | Função |
|--------|--------|
| **Saldos** | Planilha do mês: dia × colunas (entradas, saídas, diários, economias, cartão) + saldo acumulado |
| **Totais** | KPIs do mês + movimentações agregadas |
| **Horizonte** | Heatmap multi-mês de saldo projetado |
| **Previsão de diário** | Gastos fixos ÷ N dias = teto diário |
| **Tags** | Categorias dentro de cada coluna |
| **Menu** | Perfil, assinatura, configurações, ajuda, legal |

### 1.4 Princípios de produto

- **Saldo acumulado** é a métrica central (não só receita − despesa do dia).
- **Colunas contábeis fixas** na visão principal; tags/categorias refinam dentro delas.
- **Densidade informacional** — muitos dados na tela, cor como sinal (verde/vermelho/amarelo).
- **Zeros apagados** — R$ 0,00 não compete visualmente com valores reais.
- **Drill-down natural** — linha da planilha → drawer do dia → editar/apagar (com confirmação).
- **Contagem de cliques** serve para **diagnosticar atrito**, não para cortar passos à custa de clareza ou segurança.

---

## 2. Estado atual vs alvo

| Capacidade | Hoje | Alvo |
|------------|------|------|
| Calendário mês/semana | ✅ | ✅ (visão alternativa) |
| CRUD de lançamentos | ✅ | ✅ |
| Categorias customizáveis | ✅ | ✅ (como tags) |
| Orçamento mensal por categoria | ✅ | ✅ |
| Recorrentes | ✅ | ✅ (alimentam planilha + horizonte) |
| Auth (email/senha) | ✅ | ✅ |
| Design system (verde-azulado) | ✅ | ✅ |
| **Planilha Saldos** | ❌ | ✅ Fase A |
| **Saldo running + heatmap** | ❌ | ✅ Fase A |
| **Colunas fixas (D/E/C)** | ❌ | ✅ Fase B |
| **Tela Totais (KPIs)** | ❌ | ✅ Fase C |
| **Previsão de diário** | ❌ | ✅ Fase D |
| **Horizonte multi-mês** | ❌ | ✅ Fase E |
| Day sheet: navegação entre dias | ❌ | ✅ Fase A |
| Day sheet: filtro por tipo | ❌ | ✅ Fase A |
| Perfil + assinatura SaaS | ❌ | ✅ Fase F |
| Menu / ajuda / legal | ❌ | ✅ Fase F |

---

## 3. Arquitetura de informação

### 3.1 Navegação alvo

```
AppShell (sidebar compacta)
├── /saldos          ← tela principal (default após login)
├── /totais          ← dashboard do mês
├── /horizonte       ← projeção multi-mês
├── /tags            ← categorias (renomear /categories)
├── /calendario      ← visão calendário (existente)
├── /recorrentes     ← recorrentes (existente)
├── +                ← novo lançamento (FAB ou header)
├── ir pra hoje      ← atalho global
└── /menu            ← perfil, previsão diário, config, legal
    ├── /menu/previsao-diario
    ├── /menu/perfil
    └── /menu/configuracoes
```

### 3.2 Fluxo de dados entre módulos

```
Previsão de diário ──► Totais (card "Diário médio" = teto R$ X)
       │
       ▼
Recorrentes ──► Saldos (lançamentos automáticos por dia)
       │
       ▼
Transações manuais ──► Saldos ──► Totais (KPIs)
                         │
                         ▼
                    Horizonte (saldo projetado)
```

---

## 4. Modelo de domínio

### 4.1 Colunas contábeis (LedgerColumn)

Tipos fixos na planilha, independentes de categoria:

| Código | Nome | Ícone | Papel |
|--------|------|-------|-------|
| `INCOME` | Entradas | ↙ verde | Receitas |
| `EXPENSE` | Saídas | ↗ vermelho | Despesas pontuais |
| `DAILY` | Diários | D rosa | Gastos fixos do dia a dia |
| `SAVINGS` | Economias | E verde | Reservas / poupança |
| `CARD` | Cartão | C roxo | Compromissos de cartão |

**Mapeamento inicial:** categorias existentes ganham um campo `ledgerColumn` (default: `INCOME` ou `EXPENSE` conforme `type`).

### 4.2 Saldo running

Para cada dia `d` do mês:

```
saldo[d] = saldo[d-1]
         + entradas[d]
         - saídas[d]
         - diários[d]
         - cartão[d]
         + economias[d]   // economia como movimento positivo no caixa, ou negativo se retirada — definir convenção na Fase B
```

**Saldo inicial do mês:** `openingBalance` configurável pelo usuário (ou saldo final do mês anterior).

### 4.3 KPIs (Totais)

| KPI | Fórmula | Status textual |
|-----|---------|----------------|
| **Performance** | `entradas_mês − custo_de_vida` | "sobrou dinheiro" / "no vermelho" |
| **Economizado** | `economias_mês / entradas_mês × 100` | "nada guardado" / "X% guardado" |
| **Custo de vida** | `saídas + diários + cartão` | "dentro da renda" / "acima da renda" |
| **Diário médio** | `gasto_diários_mês / dias_com_gasto` vs teto da Previsão | compara com R$ X/dia previsto |

### 4.4 Previsão de diário

```
teto_diário = Σ(gastos_fixos_mensais) / divisor_dias
```

- `gastos_fixos_mensais`: lista editável (Mercado, Combustível…).
- `divisor_dias`: padrão 30, configurável.

### 4.5 Horizonte

Para cada dia futuro `d` em `[hoje .. hoje + N meses]`:

```
saldo_projetado[d] = saldo_projetado[d-1]
                   + recorrentes_previstas[d]
                   + lançamentos_manuais_futuros[d]   // se houver
```

Heatmap: vermelho (negativo) → amarelo (baixo) → verde (saudável). Thresholds configuráveis por usuário (Fase E).

---

## 5. Schema Prisma (evolução proposta)

### 5.1 Schema atual (resumo)

- `User`, `Category`, `Transaction`, `CategoryBudget`, `RecurringTransaction`
- `TransactionType`: `INCOME` | `EXPENSE`

### 5.2 Alterações propostas

```prisma
enum LedgerColumn {
  INCOME    // entradas
  EXPENSE   // saídas
  DAILY     // diários
  SAVINGS   // economias
  CARD      // cartão
}

enum SubscriptionStatus {
  ACTIVE
  TRIAL
  CANCELLED
  EXPIRED
}

// Category — adicionar
model Category {
  // ... campos existentes
  ledgerColumn LedgerColumn @default(EXPENSE) // ou INCOME conforme type
}

// User — adicionar
model User {
  // ... campos existentes
  openingBalance    Decimal  @default(0) @db.Decimal(12, 2)
  subscriptionStatus SubscriptionStatus @default(TRIAL)
  subscriptionEndsAt DateTime?
  dailyDivisor      Int      @default(30)  // dias para previsão de diário
}

// Novo: gastos fixos para previsão de diário
model FixedMonthlyExpense {
  id        String   @id @default(cuid())
  userId    String
  name      String
  amount    Decimal  @db.Decimal(12, 2)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// Transaction — adicionar (opcional, Fase B)
model Transaction {
  // ... campos existentes
  ledgerColumn LedgerColumn? // override; se null, herda da Category
}
```

### 5.3 Índices recomendados

```prisma
@@index([userId, date, ledgerColumn])  // agregações por coluna/dia
```

---

## 6. Rotas e páginas

### 6.1 App Router (Next.js)

| Rota | Página | Prioridade |
|------|--------|------------|
| `/saldos` | Planilha mensal + day drawer | A |
| `/saldos?year=2026&month=9` | Mês específico | A |
| `/totais` | Dashboard KPIs | C |
| `/horizonte` | Heatmap multi-mês | E |
| `/tags` | CRUD categorias (move de `/categories`) | B |
| `/calendario` | Calendário (move de `/calendar`) | — |
| `/recorrentes` | Recorrentes | — |
| `/menu` | Hub perfil/config | F |
| `/menu/previsao-diario` | Calculadora teto diário | D |
| `/menu/perfil` | Editar perfil | F |
| `/menu/configuracoes` | Saldo inicial, divisor, thresholds | F |
| `/login`, `/register` | Auth | — |

**Redirect pós-login:** `/saldos` (substituir `/calendar` como home).

### 6.2 API / Server Actions (novas)

| Action | Responsabilidade |
|--------|------------------|
| `fetchLedgerMonthAction(year, month)` | Linhas dia a dia + totais por coluna + saldo running |
| `fetchMonthTotalsAction(year, month)` | KPIs + movimentações |
| `fetchHorizonAction(startDate, months)` | Matriz saldo projetado |
| `fetchFixedExpensesAction` | Lista previsão diário |
| `upsertFixedExpenseAction` | CRUD gasto fixo |
| `updateUserSettingsAction` | openingBalance, dailyDivisor |
| `fetchDayTransactionsAction` | ✅ já existe — estender com filtro por `ledgerColumn` |

---

## 7. Épicos e user stories

### Épico A — Planilha Saldos (MVP da inspiração)

**Objetivo:** Tela principal operacional; substituir calendário como home.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| A1 | Como usuário, quero ver uma planilha do mês com uma linha por dia | Colunas: dia, entradas, saídas, saldo; navegação `<` `>` entre meses |
| A2 | Como usuário, quero ver meu saldo acumulado por dia | Coluna saldo recalculada; heatmap amarelo/vermelho |
| A3 | Como usuário, quero clicar num dia e ver lançamentos | Drawer lateral; lista com ícone, nome, valor |
| A4 | Como usuário, quero navegar entre dias no drawer | Setas `<` `>` no header; data no centro |
| A5 | Como usuário, quero filtrar lançamentos por tipo no drawer | Campo filtro (entradas, saídas, …) |
| A6 | Como usuário, quero editar/apagar com segurança | ⋯ → editar (dialog) / apagar (confirmação) |
| A7 | Como usuário, quero ver totais no rodapé da planilha | Linha total por coluna |
| A8 | Como usuário, quero que zeros fiquem discretos | R$ 0,00 em muted; ícones acinzentados |

**Componentes:** `LedgerTable`, `LedgerDaySheet`, `BalanceCell` (heatmap).

---

### Épico B — Colunas contábeis (D / E / C)

**Objetivo:** Planilha fiel à inspiração.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| B1 | Como usuário, quero colunas diários, economias e cartão na planilha | Colunas extras na tabela |
| B2 | Como usuário, quero associar categorias a uma coluna contábil | Campo `ledgerColumn` em tags |
| B3 | Como usuário, quero definir saldo inicial do mês | Config em `/menu/configuracoes` ou inline |

---

### Épico C — Totais (dashboard mensal)

**Objetivo:** Resposta analítica rápida.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| C1 | Como usuário, quero ver Performance do mês | Card com valor + status textual |
| C2 | Como usuário, quero ver % economizado | Card com barra de progresso |
| C3 | Como usuário, quero ver Custo de vida | Card com valor + status |
| C4 | Como usuário, quero ver Diário médio vs teto | Card comparando real vs previsão |
| C5 | Como usuário, quero ver entradas e saídas totais | Seção movimentações |

**Componentes:** `TotalsDashboard`, `KpiCard`.

---

### Épico D — Previsão de diário

**Objetivo:** Calcular teto diário a partir de gastos fixos.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| D1 | Como usuário, quero listar gastos fixos mensais | CRUD com nome + valor |
| D2 | Como usuário, quero dividir por N dias | Dropdown (28/30/31/custom) |
| D3 | Como usuário, quero ver o teto diário calculado | Destaque R$ X/dia |
| D4 | Como usuário, quero que o teto alimente Totais | Card Diário médio referencia teto |

---

### Épico E — Horizonte de saldos

**Objetivo:** Projeção visual multi-mês.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| E1 | Como usuário, quero ver saldo projetado por dia em vários meses | Grid dia × mês |
| E2 | Como usuário, quero heatmap vermelho/amarelo/verde | Cores por faixa de saldo |
| E3 | Como usuário, quero que recorrentes alimentem a projeção | Auto-aplicar recorrentes futuros |
| E4 | Como usuário, quero configurar saldo inicial para projeção | Herda openingBalance |

---

### Épico F — Conta, SaaS e menu

**Objetivo:** Produto comercializável.

| ID | User story | Critérios de aceite |
|----|------------|---------------------|
| F1 | Como usuário, quero editar meu perfil | Nome, e-mail |
| F2 | Como usuário, quero ver status da assinatura | Badge "assinatura ativa" / trial |
| F3 | Como usuário, quero acessar termos e privacidade | Links estáticos |
| F4 | Como usuário, quero enviar sugestões | Form ou mailto |
| F5 | Como usuário, quero menu lateral unificado | Sidebar com ícones |

---

### Épico G — Calendário (manutenção)

**Objetivo:** Manter visão alternativa; não é foco da inspiração.

| ID | User story | Status |
|----|------------|--------|
| G1 | Calendário mês/semana com totais diários | ✅ |
| G2 | CRUD via day sheet | ✅ |
| G3 | Recorrentes + orçamentos | ✅ |

---

## 8. Design e UX

### 8.1 Identidade visual (decidido)

- **Primária:** verde-azulado (`oklch(0.52 0.11 175)`)
- **Receita:** `--income`
- **Despesa:** `--expense`
- **Valores:** `tabular-nums`

Ver `src/lib/design.ts` e `src/app/globals.css`.

### 8.2 Padrões de interação (decidido)

| Decisão | Escolha |
|---------|---------|
| Formulário de lançamento | Dialog focado (intuitivo) |
| Exclusão | Confirmação antes de apagar (seguro) |
| Cliques | Medir atrito, não minimizar à força |
| Day sheet | Drawer sobre planilha (contexto preservado) |

### 8.3 Heatmap de saldo (proposta)

| Faixa | Cor | Exemplo |
|-------|-----|---------|
| Saldo < 0 | Vermelho intenso | −R$ 1.373 |
| Saldo 0 – limiar baixo | Amarelo | R$ 200 |
| Saldo > limiar | Verde / neutro | R$ 4.960 |

Limiar configurável em `/menu/configuracoes` (Fase B/E).

### 8.4 Sidebar

- Ícones + labels colapsáveis
- `+` sempre acessível
- Indicador do módulo ativo (underline ou cor primária)
- Mobile: bottom nav ou drawer

---

## 9. Roadmap de implementação

| Fase | Épico | Entregável | Dependências |
|------|-------|------------|--------------|
| **A** | Planilha Saldos | `/saldos`, saldo running, day drawer melhorado | Design system ✅ |
| **B** | Colunas D/E/C | Colunas extras + `ledgerColumn` em Category | A |
| **C** | Totais | `/totais` com 4 KPIs | A |
| **D** | Previsão diário | `/menu/previsao-diario` + `FixedMonthlyExpense` | — |
| **E** | Horizonte | `/horizonte` heatmap | A, recorrentes ✅ |
| **F** | SaaS / menu | `/menu`, assinatura, legal | — |
| **G** | Polish | Sidebar, redirect home, E2E | A–F |

### Ordem recomendada de desenvolvimento

```
A (Saldos) ──┬──► B (colunas)
             ├──► C (Totais) ──► D (Previsão) integra em C
             └──► E (Horizonte)

D pode paralelizar com B/C
F pode paralelizar após A
```

### Estimativa relativa

| Fase | Complexidade | Motivo |
|------|--------------|--------|
| A | Alta | Nova tela principal + running balance |
| B | Média | Migration + mapeamento categorias |
| C | Média | Cálculos + cards |
| D | Baixa | CRUD simples + fórmula |
| E | Alta | Projeção + grid denso |
| F | Média | SaaS billing fora de escopo v1 |

---

## 10. Critérios de sucesso (produto)

| Métrica | Meta |
|---------|------|
| Responder "quanto tenho hoje?" | ≤ 2 cliques (abrir app → ver saldo de hoje) |
| Registrar despesa no dia | ≤ 3 cliques (dia → adicionar → salvar) |
| Ver performance do mês | ≤ 2 cliques (totais) |
| Identificar mês no vermelho (horizonte) | ≤ 2 cliques (horizonte) |
| Cobertura E2E fluxos críticos | Saldos + Totais + auth |

---

## 11. Fora de escopo (v1 deste documento)

- Billing / Stripe / gateway de pagamento
- App mobile nativo
- Import CSV / Open Finance
- Multi-moeda
- Compartilhamento familiar / contas conjuntas
- Dark mode (CSS preparado, toggle na Fase G)

---

## 12. Referências no repositório

| Recurso | Caminho |
|---------|---------|
| Schema atual | `prisma/schema.prisma` |
| Design tokens | `src/app/globals.css`, `src/lib/design.ts` |
| Calendário | `src/components/calendar/` |
| Categorias | `src/components/categories/` |
| Recorrentes | `src/components/recurring/` |
| Copy pt-BR | `src/lib/copy.ts` |
| E2E | `e2e/` |

---

## Changelog deste documento

| Versão | Data | Notas |
|--------|------|-------|
| 1.0 | ago/2026 | Documento inicial a partir dos prints de inspiração + estado do app |

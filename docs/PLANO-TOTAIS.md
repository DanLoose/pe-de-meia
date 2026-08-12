# Plano — Redesign Totais (home V1)

**Objetivo:** transformar `/totais` de grid de 4 KPI cards iguais na **sentença do mês**: veredito emocional (folga) + composição orçamentária clara.

**Default de título:** header **“Como está o mês”**; nav continua **Totais**.

---

## 1. Experiência alvo

### O que o usuário percebe (≤3 s)

1. **Veredito** — sobrou / apertou / no vermelho (cor + frase humana).
2. **Número herói** — folga do mês (`receitas fixas − custo de vida`).
3. **De onde veio** — barras/stack: receitas fixas vs custo de vida (fixos + variáveis).
4. **Próximo passo** — CTA para Compromissos se setup incompleto.

### Hierarquia visual

| Peso | Bloco | Conteúdo |
|------|--------|----------|
| 1 | Herói (sem card) | Folga + veredito + seletor de mês discreto |
| 2 | Composição | Receitas fixas · Custo de vida · breakdown fixos / variáveis |
| 3 | Setup | CTA se faltar receita, gasto fixo ou estimativa |
| 4 | Secundário | Economizado (se > 0) · Movimentações do ledger |

### Fora deste redesign

- Sparklines / charts pesados / glow
- Integrar Horizonte na página
- Trocar fórmula V1 (já implementada em `getMonthTotals`)
- Redesign de Saldos / Compromissos

---

## 2. Dados

Estender [`MonthTotalsData`](src/types/index.ts) e [`getMonthTotals`](src/lib/services/totals.ts):

```ts
fixedIncome: number;       // Σ recorrentes INCOME no mês
fixedExpense: number;      // Σ recorrentes EXPENSE no mês
variableEstimate: number | null; // já existe
// performance = folga = fixedIncome - costOfLiving (já)
// costOfLiving = fixedExpense + (variableEstimate ?? 0) (já)
setupComplete: boolean;    // fixedIncome > 0 && (fixedExpense > 0 || variableEstimate)
verdict: "surplus" | "tight" | "deficit" | "empty";
```

**Veredito sugerido:**

| Condição | `verdict` | Copy (ex.) |
|----------|-----------|------------|
| Sem receita fixa e custo 0 | `empty` | “Configure seus compromissos” |
| folga > 0 e folga ≥ 10% da renda* | `surplus` | “Sobrou este mês” |
| folga ≥ 0 e < 10% | `tight` | “Fechou apertado” |
| folga < 0 | `deficit` | “No vermelho” |

\*Se `fixedIncome === 0` e há custo, `deficit` ou `empty` conforme preferência: tratar como `empty` com CTA.

Renomear na **UI** “Performance” → linguagem de folga; manter campo `performance` no tipo por compat ou alias `slack`.

---

## 3. UI / componentes

Substituir o grid de [`KpiCard`](src/components/totals/KpiCard.tsx) em [`TotalsDashboard.tsx`](src/components/totals/TotalsDashboard.tsx).

### Estrutura proposta

```
TotalsDashboard
├── MonthSwitcher          (já existe, tipografia menor / canto)
├── FolgaHero              (número grande, veredito, sem Card)
├── BudgetComposition      (receitas vs custo; breakdown)
├── SetupCallout?          (link Compromissos)
├── SavedLine?             (só se saved > 0)
└── LedgerMovements        (entradas/saídas realizadas — bloco leve)
```

Arquivos novos sob `src/components/totals/`:

- `FolgaHero.tsx`
- `BudgetComposition.tsx`
- `LedgerMovements.tsx` (extrair do Card atual)

`KpiCard.tsx` — manter só se usado em outro lugar; senão deprecar ou deixar para outros módulos.

### Design (sistema existente)

- Cores: `--income` / `--expense` / `--primary` (verde-azulado); fundo de página já suave.
- Tipografia: número herói `text-4xl`–`text-5xl`, `font-semibold`, `tabular-nums`.
- Barras: altura baixa (~8px), fill com transition `width` ~400ms uma vez no mount/mês.
- Sem card no herói; composição e movimentações podem ser blocos com `border-t` ou um único painel leve — **evitar** 4 cards iguais.
- Motion: (1) fade/slide do valor da folga ao trocar mês; (2) fill das barras; (3) troca de cor do veredito. Preferir CSS/`tw-animate` já no projeto; sem lib nova.

### Responsivo

- Mobile: herói full-width; composição empilhada; month switcher no topo.
- Desktop: herói + composição na mesma “folha” visual (uma composição, não dashboard).

---

## 4. Copy (`src/lib/copy.ts`)

| Chave | Valor proposto |
|-------|----------------|
| `totals.title` | `Como está o mês` |
| `totals.subtitle` | `Custo de vida, folga e o que já se movimentou.` (pode enxugar/remover se o herói bastar) |
| `totals.performance` → `totals.slack` | `Folga` |
| Vereditos | `Sobrou este mês` / `Fechou apertado` / `No vermelho` / `Configure seus compromissos` |
| Composição | `Receitas fixas`, `Custo de vida`, `Gastos fixos`, `Variáveis (estimativa)` |
| CTA | `Ajustar compromissos` → `/gastos-fixos` |
| Movimentações | manter; labels entradas/saídas |

Nav `copy.nav.totais` permanece **Totais**.

---

## 5. Página

[`src/app/(app)/totais/page.tsx`](src/app/(app)/totais/page.tsx):

- Manter gate de onboarding.
- `PageHeader` com novo título; ou integrar mês no herói e reduzir header (título + switcher no mesmo bloco).

Preferência: **PageHeader curto** (“Como está o mês”) + switcher dentro do dashboard, sem h2 duplicado.

---

## 6. Testes

- Atualizar e2e Totais: heading `copy.totals.title`, presença do veredito/folga (não depender de 4 cards “Performance”).
- Smoke: login → `/totais` → texto de folga visível.
- Ajustar strict mode se “Performance” ainda aparecer em dois lugares (hoje AGENTS mencionava isso).

---

## 7. Ordem de implementação

1. Estender `MonthTotalsData` + `getMonthTotals` (`fixedIncome`, `fixedExpense`, `verdict`, `setupComplete`).
2. Copy de Totais (título, folga, vereditos, composição, CTA).
3. Implementar `FolgaHero` + `BudgetComposition` + `LedgerMovements`; reescrever `TotalsDashboard`.
4. Polir motion + responsivo.
5. E2E + checagem visual rápida.

---

## 8. Critério de pronto

- [ ] Primeiro viewport lê como **uma** composição (não 4 cards).
- [ ] Folga é o maior sinal tipográfico.
- [ ] Breakdown fixos + variáveis visível sem jargão “Performance”.
- [ ] CTA para Compromissos quando setup incompleto.
- [ ] Troca de mês atualiza herói e barras.
- [ ] E2E auth + Totais passam com novo heading.

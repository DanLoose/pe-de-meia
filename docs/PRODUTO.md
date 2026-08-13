# Pé-de-meia — Documento de Produto

> Controle de caixa e orçamento pessoal: receitas/gastos fixos + estimativa de variáveis (custo de vida), com planilha de saldos e projeção. Registros do dia com método de pagamento vêm na fase seguinte.

**Versão:** 3.1 (fluxo de vida + wireframes)  
**Data:** agosto/2026  
**Domínio canônico:** [`DOMINIO.md`](./DOMINIO.md)  
**Wireframes:** [`wireframes/index.html`](./wireframes/index.html)

---

## 0. Fluxo de vida (antes das telas)

Persona: trabalhador com renda previsível. Quer **não passar susto**, não virar contador.

### Dois tempos

| Tempo | Pergunta | Capacidade |
|-------|----------|------------|
| **Mês (plano)** | Depois das contas, quanto sobra pra viver? | Totais / Compromissos (folga) |
| **Caixa (agora)** | Tenho dinheiro hoje? Quando fica vermelho? | Saldos / Projeção |

O app **propõe estilo de vida** (coach: guardar, cortar variável, encurtar trecho vermelho) — não só rastreia contas.

### Setup (≤10 min)

1. Receitas e gastos fixos (tipo explícito)  
2. Estimativa do variável  
3. Saldo hoje + cartão  
→ **Aha:** ver a folga antes de lançar o dia.

### Rituais

- **Marcos do mês:** abrir Totais (pós-salário, meio, fim).  
- **Ansiedade de caixa:** Saldos (heatmap + “vermelho do dia X–Y”).  
- **Ansiedade futura:** Projeção (trechos curtos vs longos).  
- **Vida mudou:** Compromissos.  
- **Registrar o dia:** opcional (V2) — “como pagou?”.

Wireframes clicáveis: pasta [`docs/wireframes/`](./wireframes/).

---

## 1. Visão

### 1.1 Problema

Pessoas que controlam finanças no dia a dia precisam responder, rapidamente:

- Quanto comprometi e estimei este mês (**custo de vida**)?
- Com minhas **receitas fixas**, sobra quanto (**folga**)?
- Quanto tenho **hoje** na conta? (quando houver lançamentos / planilha)
- Vou ficar **no vermelho** nos próximos meses? (Horizonte)

### 1.2 Proposta (V1)

**Pé-de-meia** começa simples:

1. **Receitas fixas** — o que entra todo mês.
2. **Gastos fixos** — contas que se repetem.
3. **Gastos variáveis (estimativa)** — quanto se espera gastar no variável do mês (meta, não lançamento).
4. **Custo de vida** = fixos + variáveis estimados; **folga** ≈ receitas fixas − custo de vida.

Em paralelo (já no app, alinhados ao caixa):

- **Saldos** — planilha diária com saldo running.
- **Totais** — visão do mês (evoluir KPIs para o custo de vida V1).
- **Horizonte** — saldo projetado multi-mês.

**Fora do V1 (produto):** nomenclatura **Diário**, **teto diário**, KPI “diário médio vs teto”. Ver fases abaixo.

### 1.3 Princípios

- **Custo de vida entendível** sem exigir lançar cada café.
- **Estimativa antes da disciplina diária** — ordem de maturidade.
- **Saldo acumulado** é a métrica de caixa (quando houver movimentos).
- **Um lançamento = um destino de caixa** (V2+: método de pagamento decide; nunca duas colunas).
- **Densidade informacional** na planilha; zeros discretos; confirmação antes de apagar.

---

## 2. Fases de produto

| Fase | Status | Conteúdo |
|------|--------|----------|
| **V1** | Definição ativa | Receitas fixas, gastos fixos, gastos variáveis (estimativa) → custo de vida / folga |
| **V2** | Próxima | Registros do dia com método de pagamento (conta/PIX/débito vs cartão); comparar realizado vs estimativa (leve); sem chamar de Diário; sem teto |
| **V3** | Futuro | Opcional: coluna/nomenclatura Diário + teto (estimativa ÷ N dias) |

```text
V1 (fixos + estimativa) → V2 (registros + pagamento) → V3 (Diário/teto opcional)
```

### 2.1 Estado do app vs definição

| Capacidade | Código hoje | Definição V1 |
|------------|-------------|--------------|
| Auth, recorrentes | ✅ | ✅ Receitas/gastos fixos (categorias internas, sem UI de Tags) |
| Lista `FixedMonthlyExpense` | ✅ (UI **Variáveis (estimativa)**) | ✅ Gastos variáveis (estimativa) — sem teto |
| Saldos / Totais / Horizonte | ✅ | ✅ Manter; alinhar copy/KPIs ao custo de vida V1 |
| Coluna `DAILY` / teto / divisor | ✅ legado | ❌ Fora da linguagem ativa até V3 |
| Calendário | ✅ (secundário) | Visão alternativa |
| Billing Stripe | ❌ | Fora de escopo |

---

## 3. Arquitetura de informação (V1)

```
AppShell
├── /mapa-financeiro     ← home pós-login (plano do mês)
├── /horizonte           ← projeção
├── /extrato             ← lançamentos do mês
├── /gastos-fixos       ← Compromissos (fixos + estimativa de variáveis)
├── /menu                ← conta: saldo, cartão, perfil
├── /saldos              ← planilha de caixa (fora do menu principal)
└── /calendario          ← visão alternativa
```

Fluxo mental:

```text
Receitas fixas ──┐
Gastos fixos ────┼──► Custo de vida / Folga (Totais)
Variáveis (est.)─┘
       │
Recorrentes materializam ──► Saldos ──► Horizonte
```

---

## 4. Modelo de domínio

Canônico em [`DOMINIO.md`](./DOMINIO.md). Resumo V1:

```text
custo_de_vida ≈ Σ gastos_fixos + Σ gastos_variáveis(estimativa)
folga         ≈ Σ receitas_fixas − custo_de_vida
```

### V2 — Registros do dia (definido, ainda não é o foco da UI)

- Registrar gastos como aconteceram.
- Perguntar **como pagou?** (conta → afeta saldo hoje; cartão → fatura).
- Categoria interna é atribuída automaticamente (sem picker de Tags).
- Estimativa **não** auto-lança.
- Sem nomenclatura Diário; sem teto.

### V3 — Diário + teto (só quando maduro)

```text
teto_diário = Σ(estimativa_variáveis) / divisor_dias
```

Não prometer até lá.

---

## 5. Mapeamento código ↔ produto

| Código | Produto v3 |
|--------|------------|
| `RecurringTransaction` INCOME | Receitas fixas |
| `RecurringTransaction` EXPENSE | Gastos fixos |
| `FixedMonthlyExpense` | Gastos variáveis (estimativa) |
| `dailyDivisor` / teto / “Diário médio” | Deprecated na definição até V3 |
| `LedgerColumn.DAILY` | Legado; UI não deve empurrar “Diário” como conceito central |
| `CARD` + fatura | Forte na V2 |

Detalhe completo: [`DOMINIO.md`](./DOMINIO.md) §8 e [`MAPEAMENTO-LEGADO.md`](./MAPEAMENTO-LEGADO.md).

---

## 6. Rotas (referência)

| Rota | Papel V1 |
|------|----------|
| `/mapa-financeiro` | Home — plano do mês |
| `/horizonte` | Projeção |
| `/extrato` | Lançamentos do mês |
| `/gastos-fixos` | Compromissos: fixos + estimativa variáveis |
| `/gastos-fixos/orcamento-diario` | Rota legada → UI de **estimativa de variáveis** |
| `/menu` | Conta: saldo, cartão, perfil |
| `/tags`, `/categories` | Redirect → `/menu` (Tags removidas da UI) |
| `/saldos`, `/calendario` | Apoio / legado |
| `/comecar` | Onboarding (saldo, fixos, estimativa, cartão) |

**Redirect pós-login:** `/mapa-financeiro`.

---

## 7. Épicos (priorização atual)

### Épico V1 — Vocabulário e custo de vida

| ID | Objetivo |
|----|----------|
| V1.1 | Copy/nav: receitas fixas, gastos fixos, gastos variáveis (estimativa) |
| V1.2 | Remover teto/Diário da narrativa (docs + UI copy) |
| V1.3 | Totais: custo de vida / folga = fixos + estimativa (feito) |

### Épico V2 — Registros do dia

| ID | Objetivo |
|----|----------|
| V2.1 | Formulário pay-first (conta vs cartão) |
| V2.2 | Um lançamento = uma coluna; helper de fatura |
| V2.3 | Comparar realizado vs estimativa (opcional, leve) |

### Épico V3 — Diário + teto

Só após V1/V2 estáveis.

### Já entregues (manutenção)

Saldos, colunas de ledger, cartão/fatura, Horizonte, auth, onboarding base — ver histórico em git / `PLANO-DOMINIO.md`. Categorias seed internas substituem a antiga UI de Tags.

---

## 8. Design e UX

- Primária: verde-azulado (`oklch(0.52 0.11 175)`) — `src/lib/design.ts`, `globals.css`
- Formulário de lançamento: dialog; exclusão com confirmação
- Day sheet: drawer sobre a planilha
- Heatmap de saldo: vermelho / amarelo / verde (limiar configurável — polish)

---

## 9. Critérios de sucesso (V1)

| Métrica | Meta |
|---------|------|
| Entender custo de vida | ≤ 2 min no setup (fixos + estimativa) |
| Ver folga vs receitas | ≤ 2 cliques (Totais) |
| Responder “quanto tenho hoje?” | ≤ 2 cliques (Saldos) quando houver caixa configurado |
| Não ver promessa de teto diário | Copy/onboarding sem ÷ dias |

---

## 10. Fora de escopo

- Billing / Stripe
- App mobile nativo
- Import CSV / Open Finance
- Multi-moeda / contas conjuntas
- Multi-cartão avançado, fatura parcial
- Auto-lançar a partir da estimativa
- Diário + teto (adiado à V3)

---

## 11. Referências

| Recurso | Caminho |
|---------|---------|
| Domínio | `docs/DOMINIO.md` |
| Mapeamento legado | `docs/MAPEAMENTO-LEGADO.md` |
| Plano de implementação caixa/cartão | `docs/PLANO-DOMINIO.md` |
| Schema | `prisma/schema.prisma` |
| Copy pt-BR | `src/lib/copy.ts` |

---

## Changelog

| Versão | Data | Notas |
|--------|------|-------|
| 1.0 | ago/2026 | Documento inicial (planilha + Diário/teto) |
| 3.0 | ago/2026 | Modelo simplificado: fixos + estimativa variável; Diário/teto → V3; registros do dia → V2 |
| 3.1 | ago/2026 | Fluxo de vida + saúde financeira; link para wireframes em `docs/wireframes/` |

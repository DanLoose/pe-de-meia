# Plano de implementação — domínio de caixa, cartão e economias

Alinhado a [`DOMINIO.md`](./DOMINIO.md). Objetivo histórico: o Saldo da planilha passa a ser caixa real; Cartão vira compromisso + fatura; Economias saem da conta.

> **Produto v3 (ago/2026):** a definição ativa em [`PRODUTO.md`](./PRODUTO.md) / [`DOMINIO.md`](./DOMINIO.md) remove **Diário/teto** do núcleo. `FixedMonthlyExpense` = **gastos variáveis (estimativa)**; recorrentes = receitas/gastos fixos. Teto/`dailyDivisor` ficam para fase V3. Este plano documenta o trabalho de caixa/cartão já feito — não reintroduzir teto diário sem alinhar ao produto.

Não misturar nesta entrega: redesign visual de Totais/Horizonte, multi-cartão avançado, fatura parcial.

---

## Situação atual (código)

| Ponto | Arquivo | Comportamento hoje |
|-------|---------|--------------------|
| Running balance | [`src/lib/services/ledger.ts`](../src/lib/services/ledger.ts) | `cashDelta`: Entradas `+`, demais `−` se `affectsBalance` (Economias saem do caixa) |
| Horizonte | [`src/lib/services/horizon.ts`](../src/lib/services/horizon.ts) | `cashDelta`; fatura no `dueDay`; compra CARD não move caixa |
| Totais | [`src/lib/services/totals.ts`](../src/lib/services/totals.ts) | Custo de vida = saídas + diários + **pagamentos** de fatura |
| Transação | [`prisma/schema.prisma`](../prisma/schema.prisma) | Compra CARD `affectsBalance=false`; pagamento `true` no vencimento |
| Previsão | `FixedMonthlyExpense` | Lista de teto diário; nome de modelo legado |

---

## Fase 0 — Documentação

- [x] [`docs/DOMINIO.md`](./DOMINIO.md)
- [x] Este plano
- [x] Atualizar [`docs/PRODUTO.md`](./PRODUTO.md) §4 para apontar ao domínio e corrigir fórmulas

---

## Fase 1 — Sinal de Economias e impacto de caixa

Status: feita. Cartão continua baixando saldo no dia da compra até a Fase 3.

Correção de consistência **sem** fatura ainda. Cartão continua baixando saldo no dia da compra (legado) até a Fase 3.

### 1.1 Campo `affectsBalance`

Em `Transaction`:

```prisma
affectsBalance Boolean @default(true)
```

Defaults na criação:

- `INCOME` / `EXPENSE` / `DAILY` / `SAVINGS` → `true`
- `CARD` → `true` **nesta fase** (compat), mudará na Fase 3

Helper único, p.ex. `cashDelta(column, amount, affectsBalance)`:

- se `!affectsBalance` → `0`
- `INCOME` → `+amount`
- demais colunas → `−amount`

### 1.2 Fórmula do saldo

Trocar `+ savings` por `− savings` via o helper (Economias passam a sair do caixa).

Arquivos: `ledger.ts`, `horizon.ts` (`netEffectForColumn`).

### 1.3 Totais

- Economizado continua `Σ SAVINGS` (valor guardado).
- Custo de vida **não** inclui Economias (já não inclui).
- Performance inalterada na fórmula (Entradas − custo de vida).

### 1.4 Testes

- Unitário da fórmula: Entrada 1000, Economia 200, Diário 50 → saldo `750`, não `1150`.
- E2E Saldos: célula de economias continua abrindo a coluna; saldo do dia reflete saída.

### Risco

Saldos já gravados de usuários demo/reais **mudam**. Aceitável nesta fase de produto; documentar no PR.

---

## Fase 2 — Cartão como conta (um cartão por usuário)

Status: feita. Compras CARD passam a ter fatura do ciclo; o saldo ainda baixa no dia da compra até a Fase 3.

Modelo mínimo para ciclo, sem UI rica ainda.

```prisma
model CardAccount {
  id          String   @id @default(cuid())
  userId      String   @unique
  name        String   @default("Cartão")
  closingDay  Int      // 1–28
  dueDay      Int      // 1–28
  // ...
}

model CardInvoice {
  id            String
  userId        String
  cardAccountId String
  cycleStart    DateTime @db.Date
  cycleEnd      DateTime @db.Date
  dueDate       DateTime @db.Date
  status        CardInvoiceStatus // OPEN | CLOSED | PAID
  paymentTransactionId String?
}

// Transaction
cardInvoiceId String?
installmentIndex Int?
installmentCount Int?
```

- Seed/migração: criar `CardAccount` padrão (`closingDay = 1`, `dueDay = 10` ou config no Menu) para cada user.
- Ao criar lançamento `CARD`, resolver a fatura `OPEN` do ciclo da `date` e associar `cardInvoiceId`.
- UI mínima em Configurações: fechamento e vencimento.

Serviço: `resolveInvoiceForPurchase(userId, date)` — cria fatura do ciclo se não existir.

---

## Fase 3 — Compras não baixam saldo; pagamento no vencimento

Status: feita.

### 3.1 Compras

- `ledgerColumn = CARD` + `affectsBalance = false`
- Continuam somando na **célula** Cartão do dia da compra (atividade)
- Saldo **ignora**

### 3.2 Pagamento

Job/serviço chamado em:

- `getLedgerMonth` / `getMonthTotals` / `getHorizon` (mesmo padrão de `ensureRecurringTransactions`)

Para cada fatura com `dueDate` no intervalo e `status != PAID`:

- Somar compras do ciclo
- Upsert transação de pagamento: coluna `CARD`, `affectsBalance = true`, data = `dueDate`, descrição `Fatura {mês}`
- Fechar ciclo anterior (`CLOSED`/`PAID` conforme regra: `PAID` ao materializar o pagamento previsto)

### 3.3 Totais

Custo de vida: Saídas + Diários + `CARD` **com** `affectsBalance`.

Diário médio: só `DAILY`.

Rodapé da planilha Cartão: manter soma das **compras** (atividade). O pagamento aparece no dia do vencimento na mesma coluna, mas só ele entra no running. Se a célula do vencimento misturar compras do dia + fatura, aceitar na v1; refinar depois (duas linhas no drawer já separam).

### 3.4 Parcelas (v1 enxuta)

Campo opcional `installmentCount` / `installmentIndex` no form de Cartão.

v1: se `count > 1`, criar N lançamentos `CARD` `affectsBalance=false` em N ciclos futuros (N faturas). Sem UI de “editar série” ainda.

### 3.5 Recorrentes

Não gerar Cartão como caixa. Recorrente de categoria `CARD` → compromisso nas faturas (`affectsBalance=false`), não Saída.

---

## Fase 4 — Previsão de diário alinhada ao domínio

Status: feita. Copy e UI descrevem orçamento de **Diários**, não contas fixas nem fatura.

Sem migrar o nome da tabela nesta fase (custo/risco). Só produto e copy:

- Copy/subtitle: teto de **gastos diários variáveis**, não “contas fixas”.
- Totais já compara Diário médio com esse teto — manter.
- Não puxar Saídas nem faturas para essa lista.

Opcional depois: rename `FixedMonthlyExpense` → `DailyBudgetItem` (migração Prisma à parte).

---

## Fase 5 — UI e copy de domínio

Status: feita. Hints no form/day sheet, badge compromisso/pagamento no Cartão; fechamento/vencimento já em Configurações (Fase 2).

- Textos curtos no seletor de coluna do `EntryForm` / day sheet (tooltip ou descrição: “sai da conta hoje” vs “vai para a fatura”).
- Day sheet em Cartão: badge ou sublabel “compromisso” vs “pagamento”.
- Configurações: fechamento/vencimento do cartão.
- Atualizar e2e Saldos/Totais se totais e saldo mudarem.

---

## Ordem e dependências

```
Fase 0 (docs)
  → Fase 1 (Economias −caixa + helper cashDelta)
    → Fase 2 (CardAccount + Invoice + vínculo na compra)
      → Fase 3 (affectsBalance false nas compras + materializar pagamento)
        → Fase 4 (copy previsão)
        → Fase 5 (UI)
```

Fases 4 e 5 podem paralelizar depois da 3.

---

## Fora de escopo (v1)

- Vários cartões por usuário
- Pagamento parcial / atraso / juros
- Fatura como linha em Saídas (fica em Cartão)
- Economia negativa / resgate como tipo próprio (usar Entrada)
- Recalcular histórico de faturas de transações CARD antigas além de: backfill `cardInvoiceId` + marcar compras antigas `affectsBalance=false` e gerar pagamentos nos vencimentos já passados (script de uma vez na Fase 3)

---

## Critérios de aceite (fim da Fase 3)

1. Mercado no débito reduz saldo no dia; mercado no crédito não.
2. No vencimento, o saldo cai pelo total da fatura do ciclo.
3. PIX para poupança reduz saldo e aumenta “economizado”, sem entrar em custo de vida.
4. Aluguel (Saída) reduz saldo no dia do pagamento.
5. Previsão de diário continua sendo teto só para comparar Diários.
6. Horizonte não fica negativo no dia da compra no crédito; fica no `dueDay`.

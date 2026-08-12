# Pé-de-meia — Domínio financeiro

Fonte de verdade do significado financeiro do produto.

**Versão de produto:** v3 (simplificado) — agosto/2026.

**Saldos** (quando em uso) mede o **caixa da conta corrente**. Só altera o **Saldo** o que entra ou sai de fato do banco (PIX, TED, débito, dinheiro, crédito de salário, pagamento de fatura).

---

## 0. Vocabulário ativo (v1)

Três blocos de configuração. Sem jargão **Diário** e sem **teto diário** nesta fase.

| Bloco | O que é | Papel |
|-------|---------|--------|
| **Receitas fixas** | Fontes que se repetem (salário, etc.) | Entrada previsível |
| **Gastos fixos** | Contas/compromissos que se repetem (aluguel, internet…) | Parte do custo de vida |
| **Gastos variáveis (estimativa)** | Orçamento do que se *espera* gastar no variável do mês (mercado, lazer, transporte…) | Parte do custo de vida — **meta**, não lançamento |

```text
custo_de_vida ≈ Σ gastos_fixos + Σ gastos_variáveis(estimativa)
folga         ≈ Σ receitas_fixas − custo_de_vida
```

A estimativa **não** materializa lançamentos e **não** se divide por dias (sem teto/dia).

**Dois tempos (fluxo de vida):** o **mês** responde “sobra pra viver?” (folga = plano). O **caixa** responde “tenho hoje / quando fica vermelho?” (Saldos e Projeção). Não misturar as duas verdades sem legenda. Ver [`PRODUTO.md`](./PRODUTO.md) §0 e wireframes em [`wireframes/`](./wireframes/).

### Fases de produto

| Fase | Conteúdo |
|------|----------|
| **V1 (agora)** | Receitas fixas + gastos fixos + gastos variáveis (estimativa) → custo de vida / folga |
| **V2 (próxima)** | Registros do dia com **método de pagamento** (conta vs cartão); um lançamento = um destino de caixa; ainda sem nomenclatura Diário nem teto |
| **V3 (madura)** | Opcional: nomenclatura/coluna Diário + teto (estimativa ÷ divisor de dias) |

Até a V3, **não** prometer Diário/teto na copy nem no onboarding.

---

## 1. Camadas

| Camada | Representa | Mexe no Saldo? |
|--------|------------|----------------|
| **Conta (caixa)** | Movimento real na conta | Sim |
| **Cartão de crédito** | Compra agora, paga no vencimento | Não, até o pagamento da fatura |
| **Reserva** | Transferência da conta para poupança/investimento | Sim (sai do caixa) |
| **Orçamento** | Estimativa de gastos variáveis do mês | Não (meta, não movimento) |

Pergunta-chave para classificar um lançamento (V2+): **o dinheiro saiu (ou entrou) na conta hoje?**

---

## 2. Compromissos vs estimativa (V1)

### 2.1 Receitas fixas

Recorrentes de entrada (`RecurringTransaction` com tipo renda / coluna Entradas).

- Exemplos: salário, pensão, aluguel recebido.
- Materializam lançamentos de **Entrada** nos dias configurados.
- Alimentam a folga do mês na visão orçamentária.

### 2.2 Gastos fixos

Recorrentes de saída da conta (`RecurringTransaction` de despesa / coluna Saídas).

- Exemplos: aluguel, internet, telefone, condomínio, escola, seguro, financiamento, IPTU.
- “Fixa” = **obrigação previsível**, não “o valor nunca muda”.
- **Não** misturar com itens da estimativa variável (aluguel ≠ mercado).

### 2.3 Gastos variáveis (estimativa)

Lista mensal de o que se *espera* gastar no consumo variável (`FixedMonthlyExpense` no schema — nome legado).

- Exemplos: mercado, combustível, delivery, lazer, transporte por app.
- Entra no **custo de vida** como soma mensal.
- Não é lançamento; não gera linha na planilha sozinha.
- Aluguel, internet e fatura **não** entram nesta lista.

---

## 3. Colunas da planilha (ledger — legado em código, V2+)

O schema ainda tem cinco colunas. Na **linguagem de produto V1** o protagonismo é o trio fixo/estimativa. As colunas continuam válidas para caixa quando houver lançamentos.

### 3.1 Entradas (`INCOME`)

Ganho que **entra na conta**. Efeito: `+ saldo` no dia do crédito.

### 3.2 Saídas (`EXPENSE`)

Contas/compromissos **pagos da conta**. Efeito: `− saldo` no dia do pagamento. Em geral alimentadas por **gastos fixos** recorrentes.

### 3.3 Coluna `DAILY` (legado de código)

Gasto variável **à vista** (débito, PIX, dinheiro). Ainda existe no schema e na planilha.

- **Fora da linguagem V1** (não chamar de “Diário” na narrativa de produto).
- Na **V2**, o equivalente é “gastei da conta” via método de pagamento — sem marca “Diário”.
- Na **V3**, pode voltar nomenclatura/teto se fizer sentido.

### 3.4 Cartão (`CARD`)

Gasto **no crédito**. Consumo num dia; caixa só no **vencimento da fatura**.

| Tipo | Quando | Aparece na coluna | Mexe no Saldo? |
|------|--------|-------------------|----------------|
| **Compra (compromisso)** | Dia da compra | Sim | Não |
| **Pagamento da fatura (caixa)** | Dia do vencimento | Sim | Sim (`−`) |

Eixo narrativo forte a partir da **V2** (método de pagamento). Na V1 não é o foco do onboarding.

**Regra (V2+):** um lançamento = uma coluna. Meio de pagamento decide. Nunca Diário+Cartão ao mesmo tempo. A natureza do consumo (comida, lazer) vai na **tag**.

### 3.5 Economias (`SAVINGS`)

Dinheiro **tirado da conta para guardar**. `− saldo`; em Totais conta como economizado, **não** como custo de vida.

### 3.6 Saldo

```
saldo[d] = saldo[d-1]
         + entradas[d]
         − saídas[d]
         − gastos_à_vista[d]   // coluna DAILY no código
         − pagamentos_de_fatura[d]
         − economias[d]
```

Compras no cartão aparecem na coluna Cartão e **não** entram nesta fórmula até o pagamento.

**Saldo inicial:** `openingBalance`.

---

## 4. Teste de classificação (lançamentos)

| Situação | Destino | Caixa no dia? |
|----------|---------|---------------|
| Salário caiu na conta | Entrada | Sim (`+`) |
| Aluguel no dia 5 | Saída | Sim (`−`) |
| Mercado no débito/PIX | À vista (`DAILY`) | Sim (`−`) |
| Mercado no crédito | Cartão (compra) | Não |
| Fatura vence dia 10 | Cartão (pagamento) | Sim (`−`) |
| PIX para poupança | Economia | Sim (`−`) |
| Item só na lista de estimativa | Orçamento | Não (meta) |

---

## 5. Fatura de cartão

Conceito próprio — **não** é gasto fixo nem item da estimativa variável.

Por cartão (um cartão padrão por usuário):

- `closingDay` / `dueDay` (1–28)
- Ciclo: compra na data `D` entra na fatura que fecha no primeiro `closingDay` ≥ `D`
- Vencimento: se `dueDay > closingDay`, no mês do fechamento; senão, no mês seguinte
- Estados: `OPEN` → `CLOSED` → `PAID` (ou `PARTIAL` no futuro)
- No vencimento: um lançamento de caixa na coluna Cartão com `affectsBalance = true`

---

## 6. Relação com os módulos

### Recorrentes → receitas / gastos fixos

Fábricas de lançamentos de caixa num dia do mês. Na UI: separar **receitas fixas** e **gastos fixos**.

### Estimativa de variáveis

Soma mensal dos itens (`FixedMonthlyExpense`). Sem ÷ `dailyDivisor` na definição ativa (divisor/teto = **V3**).

### Totais (definição V1)

UI: sentença do mês (herói de **folga** + composição orçamentária), não grid de 4 KPI cards.

| Conceito | Fórmula |
|----------|---------|
| **Custo de vida** | Gastos fixos (recorrentes `EXPENSE` ativos no mês) + gastos variáveis (estimativa) |
| **Folga** (`performance`) | Receitas fixas (recorrentes `INCOME` ativos no mês) − custo de vida |
| **Economizado** | Economias / Entradas do ledger (lançamentos do mês) |
| **Variáveis (estimativa)** | Soma de `FixedMonthlyExpense` |

**Diário médio vs teto:** fora da definição ativa até **V3**.

Movimentações em Totais continuam mostrando totais do **ledger** do mês (entradas/saídas realizadas), separado do custo de vida orçamentário.

### Horizonte

Projeta caixa com recorrentes, lançamentos manuais de caixa e pagamentos de fatura no `dueDay`.

### Tags

Refinam dentro da coluna / do tipo de movimento. Coluna = caixa; tag = rótulo (Alimentação, Moradia, …).

---

## 7. Convenção de implementação (`affectsBalance`)

| Coluna | Padrão `affectsBalance` |
|--------|-------------------------|
| Entradas, Saídas, `DAILY` | `true` |
| Economias | `true` (sinal `−`) |
| Cartão compra | `false` |
| Cartão pagamento de fatura | `true` (sinal `−`) |

---

## 8. Mapeamento legado → produto v3

| Código / docs antigos | Produto v3 |
|-----------------------|------------|
| Coluna `DAILY` / “Diários” | Legado de schema; fora da linguagem V1; na V2 = gasto do dia via pagamento na conta |
| Previsão de diário + `dailyDivisor` + teto | **Deprecated** na definição; só V3 |
| `FixedMonthlyExpense` | **Gastos variáveis (estimativa)** |
| `RecurringTransaction` EXPENSE | **Gastos fixos** |
| `RecurringTransaction` INCOME | **Receitas fixas** |
| KPI “Diário médio vs teto” | Removido da definição ativa até V3 |
| Custo de vida = saídas + diários + faturas | Alvo V1 = fixos + estimativa variável |

Este documento prevalece sobre seções antigas de produto quando houver conflito.

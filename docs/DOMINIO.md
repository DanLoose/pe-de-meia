# Pé-de-meia — Domínio financeiro

Fonte de verdade para o significado das colunas da planilha, do saldo e dos módulos que dependem delas.

**Saldos mede o caixa da conta corrente.** Só altera o **Saldo** o que entra ou sai de fato do banco (PIX, TED, débito, dinheiro, crédito de salário, pagamento de fatura).

---

## 1. Camadas

| Camada | Representa | Mexe no Saldo? |
|--------|------------|----------------|
| **Conta (caixa)** | Movimento real na conta | Sim |
| **Cartão de crédito** | Compra agora, paga no vencimento | Não, até o pagamento da fatura |
| **Reserva** | Transferência da conta para poupança/investimento | Sim (sai do caixa) |
| **Orçamento** | Teto do que se *pode* gastar em diários | Não (meta, não movimento) |

Pergunta-chave para classificar um lançamento: **o dinheiro saiu (ou entrou) na conta hoje?**

---

## 2. Colunas da planilha

### 2.1 Entradas (`INCOME`)

Qualquer ganho que **entra na conta**.

- Exemplos: salário, freela, doação, bônus, reembolso, rendimento sacado.
- Efeito no caixa: `+ saldo` no dia do crédito.
- Não é: limite de cartão, cashback ainda não creditado, “ganho” que só reduz a fatura.

### 2.2 Saídas (`EXPENSE`)

**Contas e compromissos pagos da conta**, em geral com valor e dia conhecidos.

- Exemplos: aluguel, internet, telefone, condomínio, escola, seguro, financiamento, IPTU.
- Efeito no caixa: `− saldo` no **dia do pagamento**.
- Pode ser recorrente (dia de vencimento).
- Não é: mercado, iFood, Uber, lazer (Diário).
- Não é: compra no crédito (Cartão).
- “Fixa” significa **obrigação previsível**, não “o valor nunca muda”.

### 2.3 Diários (`DAILY`)

Gasto **variável do dia a dia**, pago à vista (débito, PIX, dinheiro).

- Exemplos: mercado, padaria, delivery, lazer, transporte por app.
- Efeito no caixa: `− saldo` no dia em que o dinheiro saiu.
- Orçamentável: é o alvo da **Previsão de diário**.
- Critério: se o valor não é conhecido no começo do mês e se paga quando consome → Diário.
- Não é: conta com vencimento fixo.
- Não é: a mesma compra feita no crédito (isso é Cartão).

### 2.4 Cartão (`CARD`)

Gasto **no crédito**. O consumo é num dia; o caixa só é afetado no **vencimento da fatura**.

Há dois tipos de linha na mesma coluna:

| Tipo | Quando | Aparece na coluna | Mexe no Saldo? |
|------|--------|-------------------|----------------|
| **Compra (compromisso)** | Dia da compra | Sim | Não |
| **Pagamento da fatura (caixa)** | Dia do vencimento | Sim | Sim (`−`) |

- Parcelas: cada parcela pertence à fatura do mês correspondente.
- Assinatura no cartão (Netflix etc.) é Cartão, não Saída.
- Débito automático de internet na conta é Saída, não Cartão.

A fatura **não** é despesa fixa. É um **compromisso de data fixa e valor variável** (soma das compras do ciclo).

| | Saída (conta) | Fatura (Cartão) |
|--|---------------|-----------------|
| Data | vencimento conhecido | vencimento conhecido |
| Valor | conhecido (ou quase) | depende das compras do ciclo |
| Recorrência | o lançamento se repete | o ciclo se repete; o valor não |
| Previsão de diário | não entra no teto | não entra no teto |

### 2.5 Economias (`SAVINGS`)

Dinheiro **tirado da conta para guardar** (poupança, reserva, investimento).

- Efeito no caixa: `− saldo` (sai da conta corrente).
- Em Totais: conta como “economizado”, **não** como custo de vida.
- Não é sobra contábil. A sobra já está no saldo por não ter sido gasta; registrar de novo como `+` seria double count.
- Resgate da reserva para a conta é **Entrada** (ou Economia negativa, se no futuro houver sentido de edição), não “economia positiva no caixa”.

### 2.6 Saldo

Não é coluna de lançamento. É o acumulado de caixa:

```
saldo[d] = saldo[d-1]
         + entradas[d]
         − saídas[d]
         − diários[d]
         − pagamentos_de_fatura[d]
         − economias[d]
```

Compras no cartão **aparecem** na coluna Cartão no dia da compra e **não entram** nesta fórmula.

**Saldo inicial:** `openingBalance` do usuário (ponto de partida da conta).

---

## 3. Teste de classificação

| Situação | Coluna | Caixa no dia? |
|----------|--------|---------------|
| Salário caiu na conta | Entrada | Sim (`+`) |
| Aluguel no dia 5 | Saída | Sim (`−`) |
| Mercado no débito/PIX | Diário | Sim (`−`) |
| Mercado no crédito | Cartão (compra) | Não |
| Fatura vence dia 10 | Cartão (pagamento) | Sim (`−`) |
| PIX para poupança | Economia | Sim (`−`) |
| Netflix no cartão | Cartão (compra) | Não |
| Internet no débito automático | Saída | Sim (`−`) |

---

## 4. Fatura de cartão

Conceito próprio, não um `FixedMonthlyExpense`.

Por cartão (começar com **um cartão padrão** por usuário):

- `closingDay` — dia de fechamento do ciclo (1–28)
- `dueDay` — dia de vencimento (1–28)
- Ciclo: a compra na data `D` entra na fatura que fecha no **primeiro** `closingDay` ≥ `D`. O ciclo começa no dia seguinte ao fechamento anterior.
- Vencimento: se `dueDay > closingDay`, no mês do fechamento; senão, no mês seguinte (ex.: fecha 25, vence 10).
- Padrão do cartão único: fechamento 1, vencimento 10.

Estados: `OPEN` → `CLOSED` → `PAID` (ou `PARTIAL` no futuro).

No vencimento, o sistema materializa (ou atualiza) **um** lançamento de caixa na coluna Cartão, no valor da fatura, com `affectsBalance = true`.

---

## 5. Relação com os outros módulos

### Recorrentes

Fábricas de lançamentos de **caixa** (Entradas, Saídas, Diários, Economias) num dia do mês.

Não geram compra no crédito como se fosse saída de caixa. Assinatura de cartão, no futuro, pode nascer como compromisso de Cartão no ciclo, não como Saída.

### Previsão de diário

Orçamento **somente de Diários**.

```
teto_diário = Σ(gastos_mensais_de_diário) / divisor_dias
```

Exemplos válidos na lista: mercado, combustível, lazer, delivery.  
Aluguel, internet e fatura **não** entram nessa lista — são Saída ou Cartão.

O nome interno `FixedMonthlyExpense` é legado: na UI é “gastos mensais” do teto de diário, não contas fixas.

### Totais

| KPI | Fórmula |
|-----|---------|
| **Custo de vida** | Saídas + Diários + **pagamentos de fatura** (não a soma das comprinhas ainda não vencidas) |
| **Performance** | Entradas − custo de vida |
| **Economizado** | Economias / Entradas |
| **Diário médio** | Soma de Diários / dias com Diário, comparado ao teto |

### Horizonte

Projeta caixa dia a dia:

- Recorrentes de caixa no dia do mês
- Lançamentos manuais futuros de caixa
- **Pagamentos de fatura** no `dueDay`, com valor já conhecido (ciclo fechado) ou estimado (ciclo aberto: soma das compras já lançadas)

Compras no cartão futuras não baixam o saldo projetado até o vencimento.

### Tags

Refinam dentro da coluna. A coluna é o domínio; a tag é o rótulo (Alimentação, Moradia, …).

---

## 6. Convenção de implementação

Cada `Transaction` precisa de um impacto de caixa explícito, não só da coluna:

| Coluna | Padrão `affectsBalance` |
|--------|-------------------------|
| Entradas, Saídas, Diários | `true` |
| Economias | `true` (sinal `−` no running) |
| Cartão compra | `false` |
| Cartão pagamento de fatura | `true` (sinal `−`) |

A planilha continua agregando **todas** as linhas da coluna no valor da célula. O Saldo usa só linhas com `affectsBalance = true`, com o sinal da coluna (Entradas `+`, demais `−`).

---

## 7. O que o código faz hoje (divergências)

Registrado para o plano de implementação; não é o comportamento alvo.

1. ~~**Saldo trata Cartão como caixa no dia da compra**~~ — Fase 3: compra `affectsBalance=false`; pagamento no `dueDay`.
2. ~~**Economias somam no saldo**~~ — corrigido na Fase 1 (`cashDelta("SAVINGS")` é `−amount`).
3. ~~**Totais** incluem todas as linhas `CARD` no custo de vida~~ — Fase 3: só pagamentos (`affectsBalance`).
4. ~~**Não existe** cartão, ciclo, fechamento, vencimento nem fatura.~~ — Fases 2–3: conta, fatura e pagamento no vencimento.
5. **`PRODUTO.md`** descrevia Diários como “gastos fixos” — copy alinhada na Fase 4.
6. ~~**Previsão de diário** está modelada como `FixedMonthlyExpense`~~ — UI já trata como orçamento de Diários; rename da tabela fica fora de escopo.

Este documento prevalece sobre a seção 4 antiga do produto quando houver conflito.

# Mapeamento legado → produto v3

Referência rápida alinhada a [`DOMINIO.md`](./DOMINIO.md) §8 e [`PRODUTO.md`](./PRODUTO.md).

| Código / UI antiga | Produto v3 |
|--------------------|------------|
| `RecurringTransaction` INCOME | **Receitas fixas** |
| `RecurringTransaction` EXPENSE | **Gastos fixos** |
| `FixedMonthlyExpense` | **Gastos variáveis (estimativa)** — meta mensal, não lançamento |
| “Orçamento diário” / “Previsão de diário” | Mesma lista; copy = estimativa de variáveis |
| `dailyDivisor` + teto/dia | **Deprecated** na definição até fase **V3** |
| Coluna `DAILY` / “Diários” | Schema legado; UI “À vista”; fora da narrativa V1 |
| KPI “Diário médio vs teto” | Removido da copy ativa; estimativa mensal no breakdown de custo de vida |
| Custo de vida / Performance | **Implementado (V1):** fixos + estimativa; folga = receitas fixas − custo de vida; UI = herói + composição (não 4 cards) |
| `dailyDivisor` na UI de configurações | **Oculto** até V3 |

## Fases

1. **V1** — Fixos + estimativa → custo de vida / folga  
2. **V2** — Registros do dia + método de pagamento (sem nomenclatura Diário)  
3. **V3** — Diário + teto opcionais  

Não auto-lançar a partir da estimativa. Não dual-count estimativa + lançamento como se fossem a mesma coisa.

import { z } from "zod";

export const upsertBudgetSchema = z.object({
  categoryId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().positive("O orçamento deve ser maior que zero"),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

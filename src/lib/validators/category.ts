import { z } from "zod";
import { transactionTypeSchema } from "@/lib/validators/transaction";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  type: transactionTypeSchema,
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().min(1),
});

export const deleteCategorySchema = z.object({
  id: z.string().min(1),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

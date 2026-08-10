import { z } from "zod";
import { createTransactionSchema } from "@/lib/validators/transaction";

export const createRecurringSchema = createTransactionSchema
  .omit({ date: true })
  .extend({
    dayOfMonth: z.coerce.number().int().min(1).max(31),
  });

export const updateRecurringSchema = createRecurringSchema.extend({
  id: z.string().min(1),
  active: z.boolean().optional(),
});

export const deleteRecurringSchema = z.object({
  id: z.string().min(1),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

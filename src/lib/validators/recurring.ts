import { z } from "zod";
import { createTransactionSchema } from "@/lib/validators/transaction";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const createRecurringSchema = createTransactionSchema
  .omit({ date: true, recurring: true })
  .extend({
    dayOfMonth: z.coerce.number().int().min(1).max(31),
    startsOn: dateOnlySchema.optional(),
    endsOn: dateOnlySchema.optional().nullable(),
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

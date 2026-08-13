import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const ledgerColumnSchema = z.enum([
  "INCOME",
  "EXPENSE",
  "DAILY",
  "SAVINGS",
  "CARD",
]);

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().trim().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  categoryId: z.string().min(1, "Category is required"),
  recurring: z.boolean().optional(),
  ledgerColumn: ledgerColumnSchema.optional(),
  installmentCount: z.coerce.number().int().min(1).max(12).optional(),
});

export const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().min(1),
});

export const deleteTransactionSchema = z.object({
  id: z.string().min(1),
});

export const deleteTransactionSeriesSchema = z.object({
  id: z.string().min(1),
  scope: z.enum(["one", "series"]),
});

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const dateRangeQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  })
  .refine((value) => value.start <= value.end, {
    message: "Start date must be before or equal to end date",
    path: ["end"],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

import { TransactionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { CategoryDTO } from "@/types";

const DEFAULT_CATEGORIES: Array<{
  name: string;
  color: string;
  type: TransactionType;
}> = [
  { name: "Salary", color: "#22c55e", type: "INCOME" },
  { name: "Freelance", color: "#10b981", type: "INCOME" },
  { name: "Other Income", color: "#14b8a6", type: "INCOME" },
  { name: "Food", color: "#ef4444", type: "EXPENSE" },
  { name: "Rent", color: "#f97316", type: "EXPENSE" },
  { name: "Transport", color: "#eab308", type: "EXPENSE" },
  { name: "Utilities", color: "#a855f7", type: "EXPENSE" },
  { name: "Other Expense", color: "#64748b", type: "EXPENSE" },
];

export async function seedDefaultCategories(userId: string): Promise<void> {
  const existing = await prisma.category.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      userId,
    })),
  });
}

export async function getCategoriesByUser(
  userId: string,
  type?: TransactionType,
): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    where: {
      userId,
      ...(type ? { type } : {}),
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    type: category.type,
  }));
}

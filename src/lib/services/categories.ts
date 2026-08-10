import { TransactionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import type { CategoryDTO } from "@/types";

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

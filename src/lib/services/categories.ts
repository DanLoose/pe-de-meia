import { TransactionType, type LedgerColumn } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { defaultLedgerColumnForType } from "@/lib/ledger-columns";
import {
  createCategorySchema,
  deleteCategorySchema,
  updateCategorySchema,
} from "@/lib/validators/category";
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

function toCategoryDTO(category: {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
}): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    type: category.type,
    ledgerColumn: category.ledgerColumn,
  };
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

  return categories.map(toCategoryDTO);
}

export async function createCategory(
  userId: string,
  input: unknown,
): Promise<CategoryDTO> {
  const data = createCategorySchema.parse(input);

  const category = await prisma.category.create({
    data: {
      userId,
      name: data.name,
      color: data.color,
      type: data.type,
      ledgerColumn:
        data.ledgerColumn ?? defaultLedgerColumnForType(data.type),
    },
  });

  return toCategoryDTO(category);
}

export async function updateCategory(
  userId: string,
  input: unknown,
): Promise<CategoryDTO> {
  const data = updateCategorySchema.parse(input);

  const existing = await prisma.category.findFirst({
    where: { id: data.id, userId },
  });
  if (!existing) {
    throw new Error("Categoria não encontrada");
  }

  const category = await prisma.category.update({
    where: { id: data.id },
    data: {
      name: data.name,
      color: data.color,
      type: data.type,
      ...(data.ledgerColumn ? { ledgerColumn: data.ledgerColumn } : {}),
    },
  });

  return toCategoryDTO(category);
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  const data = deleteCategorySchema.parse({ id });

  const existing = await prisma.category.findFirst({
    where: { id: data.id, userId },
  });
  if (!existing) {
    throw new Error("Categoria não encontrada");
  }

  const usageCount = await prisma.transaction.count({
    where: { categoryId: data.id, userId },
  });
  if (usageCount > 0) {
    throw new Error("Não é possível excluir uma categoria com lançamentos");
  }

  await prisma.category.delete({ where: { id: data.id } });
}

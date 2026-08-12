"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import {
  createCategory,
  deleteCategory,
  getCategoriesByUser,
  updateCategory,
} from "@/lib/services/categories";
import type { ActionResult, CategoryDTO } from "@/types";

function revalidateApp() {
  revalidatePath("/calendar");
  revalidatePath("/categories");
  revalidatePath("/gastos-fixos");
  revalidatePath("/recurring");
}

export async function fetchCategoriesAction(): Promise<ActionResult<CategoryDTO[]>> {
  try {
    const userId = await getSessionUserId();
    const data = await getCategoriesByUser(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load categories",
    };
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<CategoryDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await createCategory(userId, input);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

export async function updateCategoryAction(
  input: unknown,
): Promise<ActionResult<CategoryDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await updateCategory(userId, input);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    await deleteCategory(userId, id);
    revalidateApp();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

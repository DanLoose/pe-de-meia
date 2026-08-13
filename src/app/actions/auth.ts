"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureCardAccount } from "@/lib/services/card";
import { seedDefaultCategories } from "@/lib/services/categories";
import type { ActionResult } from "@/types";

import { copy } from "@/lib/copy";

const registerSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export async function registerAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Já existe uma conta com este e-mail" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  await seedDefaultCategories(user.id);
  await ensureCardAccount(user.id);

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/comecar",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Não foi possível entrar após o cadastro" };
    }
    throw error;
  }

  return { success: true };
}

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/mapa-financeiro",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: copy.auth.invalidCredentials };
    }
    throw error;
  }

  return { success: true };
}

export async function demoLoginAction(): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email: "demo@pedemeia.dev",
      password: "password123",
      redirectTo: "/mapa-financeiro",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: copy.auth.invalidCredentials };
    }
    throw error;
  }

  return { success: true };
}

export async function demoLoginFormAction(_formData: FormData): Promise<void> {
  void _formData;
  await demoLoginAction();
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

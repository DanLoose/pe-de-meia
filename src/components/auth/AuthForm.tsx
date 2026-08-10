"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/copy";
import type { ActionResult } from "@/types";

const initialState: ActionResult = { success: false };

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {mode === "login" ? copy.auth.loginTitle : copy.auth.registerTitle}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? copy.auth.loginDescription
            : copy.auth.registerDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">{copy.auth.name}</Label>
              <Input id="name" name="name" required autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{copy.auth.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{copy.auth.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            data-testid="login-submit"
            disabled={pending}
          >
            {pending
              ? copy.auth.pleaseWait
              : mode === "login"
                ? copy.auth.signIn
                : copy.auth.createAccount}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {copy.auth.noAccount}{" "}
              <Link
                href="/register"
                className="text-primary underline-offset-4 hover:underline"
              >
                {copy.auth.signUp}
              </Link>
            </>
          ) : (
            <>
              {copy.auth.hasAccount}{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                {copy.auth.signIn}
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

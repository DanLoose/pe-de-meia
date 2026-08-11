"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, demoLoginFormAction } from "@/app/actions/auth";
import { AuthBanner } from "@/components/auth/AuthBanner";
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
  callbackUrl?: string;
}

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="w-full max-w-md shadow-sm">
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
      <CardContent className="space-y-4">
        {mode === "login" && callbackUrl && (
          <AuthBanner variant="redirect" />
        )}
        {mode === "login" && !callbackUrl && <AuthBanner variant="demo" />}
        {mode === "login" && (
          <form action={demoLoginFormAction}>
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              data-testid="demo-login-button"
            >
              {copy.auth.demoSignIn}
            </Button>
          </form>
        )}
        <form action={formAction} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">{copy.auth.name}</Label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="name"
                autoFocus
              />
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
              autoFocus={mode === "login"}
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
            {mode === "register" && (
              <p className="text-xs text-muted-foreground">
                {copy.auth.passwordHint}
              </p>
            )}
          </div>
          {state.error && <AuthBanner variant="error" message={state.error} />}
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
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {copy.auth.noAccount}{" "}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {copy.auth.signUp}
              </Link>
            </>
          ) : (
            <>
              {copy.auth.hasAccount}{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
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

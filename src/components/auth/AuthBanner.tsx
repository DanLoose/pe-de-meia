import { AlertCircle, Info } from "lucide-react";
import { copy } from "@/lib/copy";

interface AuthBannerProps {
  variant: "redirect" | "demo" | "error";
  message?: string;
}

export function AuthBanner({ variant, message }: AuthBannerProps) {
  if (variant === "error" && message) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === "redirect") {
    return (
      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{copy.auth.loginRequired}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
      <p className="font-medium text-foreground">{copy.auth.demoTitle}</p>
      <p className="mt-1 text-muted-foreground">
        {copy.auth.demoEmail}{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">demo@pedemeia.dev</code>
      </p>
      <p className="text-muted-foreground">
        {copy.auth.password}:{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">password123</code>
      </p>
    </div>
  );
}

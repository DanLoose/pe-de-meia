import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  inlineBack?: boolean;
}

export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel,
  inlineBack = false,
}: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref && backLabel && !inlineBack ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        ) : null}
        <div className="flex items-center gap-1">
          {backHref && inlineBack ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="inline-flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
            </Link>
          ) : null}
          <h1
            className={cn(
              "text-2xl font-semibold tracking-tight",
              inlineBack && "text-xl lowercase",
            )}
          >
            {title}
          </h1>
        </div>
        {description ? (
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              inlineBack && "ml-9",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

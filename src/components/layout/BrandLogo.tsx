import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface BrandLogoProps {
  size?: "sm" | "lg";
  className?: string;
}

export function BrandLogo({ size = "sm", className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground",
          size === "lg" ? "size-10 text-lg" : "size-8 text-sm",
        )}
        aria-hidden
      >
        P
      </div>
      <div>
        <p
          className={cn(
            "font-semibold leading-none tracking-tight",
            size === "lg" ? "text-xl" : "text-base",
          )}
        >
          {copy.appName}
        </p>
        {size === "lg" && (
          <p className="mt-1 text-sm text-muted-foreground">{copy.appTagline}</p>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import type { TotalsVerdict } from "@/types";

interface LifestyleCoachProps {
  verdict: TotalsVerdict;
  folga: number;
  missingIncome?: boolean;
}

export function LifestyleCoach({
  verdict,
  folga,
  missingIncome = false,
}: LifestyleCoachProps) {
  const message = coachMessage(verdict, folga, missingIncome);
  if (!message) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-income/5 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
        {copy.totals.coachTitle}
      </p>
      <p className="mt-1 text-sm leading-relaxed">{message}</p>
      <Link
        href="/gastos-fixos"
        className="mt-3 inline-flex h-8 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {copy.totals.coachCta}
      </Link>
    </div>
  );
}

function coachMessage(
  verdict: TotalsVerdict,
  folga: number,
  missingIncome: boolean,
): string | null {
  switch (verdict) {
    case "surplus": {
      const reserve = Math.max(100, Math.round((folga * 0.1) / 50) * 50);
      return copy.totals.coachSurplus(formatCurrency(reserve));
    }
    case "tight":
      return copy.totals.coachTight;
    case "deficit":
      return copy.totals.coachDeficit;
    case "empty":
      return missingIncome
        ? copy.totals.coachMissingIncome
        : copy.totals.coachEmpty;
  }
}

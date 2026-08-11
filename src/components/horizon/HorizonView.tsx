"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { fetchHorizonAction } from "@/app/actions/horizon";
import { HorizonGrid } from "@/components/horizon/HorizonGrid";
import { HorizonLegend } from "@/components/horizon/HorizonLegend";
import { HorizonSummaryCards } from "@/components/horizon/HorizonSummary";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import type { HorizonData } from "@/types";

const MONTH_OPTIONS = [3, 6, 12] as const;

interface HorizonViewProps {
  initialData: HorizonData;
  initialMonths: number;
}

export function HorizonView({ initialData, initialMonths }: HorizonViewProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [months, setMonths] = useState(initialMonths);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setData(initialData);
    setMonths(initialMonths);
  }, [initialData, initialMonths]);

  const changeMonths = (nextMonths: number) => {
    if (nextMonths === months) {
      return;
    }

    setMonths(nextMonths);
    startTransition(async () => {
      router.replace(`/horizonte?months=${nextMonths}`, { scroll: false });
      const result = await fetchHorizonAction(data.today, nextMonths);
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error ?? copy.toast.genericError);
      }
    });
  };

  const scrollToToday = () => {
    const dayNum = Number(data.today.split("-")[2]);
    const [year, month] = data.today.split("-").map(Number);

    document
      .getElementById(`horizon-day-${dayNum}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

    document
      .getElementById(`horizon-month-${year}-${month}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {MONTH_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={months === option ? "default" : "outline"}
              disabled={isPending}
              onClick={() => changeMonths(option)}
            >
              {option === 3
                ? copy.horizon.months3
                : option === 6
                  ? copy.horizon.months6
                  : copy.horizon.months12}
            </Button>
          ))}
          {isPending && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={scrollToToday}>
          {copy.horizon.goToday}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <HorizonSummaryCards summary={data.summary} />
      <HorizonLegend />
      <HorizonGrid data={data} />
    </div>
  );
}

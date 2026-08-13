import Link from "next/link";
import { Repeat, Table2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function SaldosEmptyHint() {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Table2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-medium">{copy.ledger.emptyTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.ledger.emptyDescription}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {copy.ledger.emptyActionHint}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/gastos-fixos"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <Repeat className="size-4" />
            {copy.ledger.emptyActionRecurring}
          </Link>
          <Link
            href="/mapa-financeiro"
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "h-auto px-0 text-muted-foreground",
            )}
          >
            {copy.nav.mapaFinanceiro}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

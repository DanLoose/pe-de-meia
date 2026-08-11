import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  status: string;
  valueClassName?: string;
  progress?: number;
}

export function KpiCard({
  title,
  value,
  status,
  valueClassName,
  progress,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-2xl font-semibold", moneyClass, valueClassName)}>
          {value}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{status}</p>
        {progress !== undefined && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { balanceClass, expenseClass, incomeClass };

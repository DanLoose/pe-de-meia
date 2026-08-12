const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatShortDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

/** Numeric day/month, e.g. 10/08. */
export function formatNumericDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

/** Compact slash date, e.g. 07/08/26. */
export function formatSlashDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

/** Compact header date, e.g. 10/ago. */
export function formatCompactDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, month - 1, day))
    .replace(".", "")
    .trim()
    .toLowerCase();
  return `${String(day).padStart(2, "0")}/${monthShort}`;
}

/** Compact currency for dense grids (e.g. horizonte). */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";

  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (abs >= 1_000) {
    const scaled = abs / 1_000;
    const formatted =
      scaled >= 100
        ? scaled.toFixed(0)
        : scaled.toFixed(1).replace(".", ",");
    return `${sign}R$ ${formatted}K`;
  }

  return formatCurrency(value);
}

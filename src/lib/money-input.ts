const amountInputFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Digits representing cents → amount in reais. */
export function digitsToAmount(digits: string): number {
  const normalized = digits.replace(/\D/g, "");
  if (!normalized) return 0;
  return Number(normalized) / 100;
}

/** Amount in reais → digit string of cents (no leading zeros beyond value). */
export function amountToDigits(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return String(Math.round(amount * 100));
}

/** Format reais for the masked input display. */
export function formatAmountInput(amount: number): string {
  return amountInputFormatter.format(amount);
}

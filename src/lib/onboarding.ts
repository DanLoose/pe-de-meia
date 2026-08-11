const CALENDAR_HINT_KEY = "pedemeia-calendar-hint-dismissed";

const hintListeners = new Set<() => void>();

function emitHintChange() {
  hintListeners.forEach((listener) => listener());
}

export function subscribeCalendarHint(onStoreChange: () => void): () => void {
  hintListeners.add(onStoreChange);
  return () => hintListeners.delete(onStoreChange);
}

export function isCalendarHintDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(CALENDAR_HINT_KEY) === "1";
}

export function dismissCalendarHint(): void {
  localStorage.setItem(CALENDAR_HINT_KEY, "1");
  emitHintChange();
}

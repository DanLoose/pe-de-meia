const SIDEBAR_COLLAPSED_KEY = "pedemeia-sidebar-collapsed";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSidebarCollapsed(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function isSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

export function setSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  emit();
}

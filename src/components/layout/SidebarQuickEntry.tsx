"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { EntryForm } from "@/components/entries/EntryForm";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

interface SidebarQuickEntryProps {
  categories: CategoryDTO[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarQuickEntry({
  categories,
  collapsed,
  onNavigate,
}: SidebarQuickEntryProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Button
        type="button"
        className={cn(collapsed ? "size-9 shrink-0 p-0" : "w-full shrink-0")}
        data-testid="sidebar-new-entry"
        aria-label={copy.entry.new}
        title={collapsed ? copy.entry.new : undefined}
        onClick={() => {
          onNavigate?.();
          setOpen(true);
        }}
      >
        <Plus className="size-4" />
        {!collapsed && copy.entry.new}
      </Button>
      <EntryForm
        open={open}
        onOpenChange={setOpen}
        date={today}
        categories={categories}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
      />
    </>
  );
}

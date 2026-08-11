import { toast } from "sonner";
import { copy } from "@/lib/copy";

export const appToast = {
  entryCreated: () => toast.success(copy.toast.entryCreated),
  entryUpdated: () => toast.success(copy.toast.entryUpdated),
  entryDeleted: () => toast.success(copy.toast.entryDeleted),
  categoryCreated: () => toast.success(copy.toast.categoryCreated),
  categoryUpdated: () => toast.success(copy.toast.categoryUpdated),
  categoryDeleted: () => toast.success(copy.toast.categoryDeleted),
  budgetSaved: () => toast.success(copy.toast.budgetSaved),
  recurringCreated: () => toast.success(copy.toast.recurringCreated),
  recurringUpdated: () => toast.success(copy.toast.recurringUpdated),
  recurringDeleted: () => toast.success(copy.toast.recurringDeleted),
  success: (message: string) => toast.success(message),
  error: (message?: string) =>
    toast.error(message ?? copy.toast.genericError),
};

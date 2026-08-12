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
  fixedExpenseCreated: () => toast.success(copy.toast.fixedExpenseCreated),
  fixedExpenseUpdated: () => toast.success(copy.toast.fixedExpenseUpdated),
  fixedExpenseDeleted: () => toast.success(copy.toast.fixedExpenseDeleted),
  success: (message: string) => toast.success(message),
  error: (message?: string) =>
    toast.error(message ?? copy.toast.genericError),
};

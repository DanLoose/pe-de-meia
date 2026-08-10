import { toast } from "sonner";
import { copy } from "@/lib/copy";

export const appToast = {
  entryCreated: () => toast.success(copy.toast.entryCreated),
  entryUpdated: () => toast.success(copy.toast.entryUpdated),
  entryDeleted: () => toast.success(copy.toast.entryDeleted),
  error: (message?: string) =>
    toast.error(message ?? copy.toast.genericError),
};

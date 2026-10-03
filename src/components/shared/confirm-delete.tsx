"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { EntityName } from "@/lib/mock/seed";
import { db } from "@/lib/mock/server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDeleteProps = {
  trigger: React.ReactNode;
  entity: EntityName;
  id: string;
  label: string;
  description?: string;
  onDeleted?: () => void;
};

/** Soft-delete confirmation wired to the mock gateway. */
export function ConfirmDelete({ trigger, entity, id, label, description, onDeleted }: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    await db.remove(entity, id);
    setPending(false);
    setOpen(false);
    toast.success(`${label} removed`, { description: "This only affects local mock data." });
    onDeleted?.();
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Delete {label}?
            </DialogTitle>
            <DialogDescription>
              {description ?? `This removes ${label} from the mock dataset. Use “Reset mock data” in the user menu to restore it.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
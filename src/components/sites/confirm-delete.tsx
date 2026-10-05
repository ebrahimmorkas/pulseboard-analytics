"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Two-step delete button: avoids accidental deletion without a blocking browser dialog. */
export function ConfirmDelete({
  onConfirm,
  label = "Delete",
  confirmLabel = "Yes, delete permanently",
}: {
  onConfirm: () => Promise<unknown>;
  label?: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden /> {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => void (await onConfirm()))}
      >
        {pending ? "Deleting…" : confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}

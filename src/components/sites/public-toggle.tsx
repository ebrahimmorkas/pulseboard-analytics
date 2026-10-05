"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setSitePublic } from "@/app/(app)/sites/actions";
import { cn } from "@/lib/utils";

export function PublicToggle({ siteId, isPublic }: { siteId: string; isPublic: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(isPublic);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      await setSitePublic(siteId, next);
      toast.success(next ? "Dashboard is now public" : "Dashboard is now private");
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label="Make dashboard public"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        optimistic ? "bg-brand-600" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          optimistic ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

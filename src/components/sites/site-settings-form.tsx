"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import type { FormState } from "@/lib/validations/auth";

export function SiteSettingsForm({
  action,
  name,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success && state.message) toast.success(state.message);
    else if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-60 flex-1 space-y-1.5">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" defaultValue={state?.fields?.name ?? name} maxLength={100} />
        <FieldError messages={state?.errors?.name} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

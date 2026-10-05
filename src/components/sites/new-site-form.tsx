"use client";

import { useActionState } from "react";
import { createSite } from "@/app/(app)/sites/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

export function NewSiteForm() {
  const [state, formAction, pending] = useActionState(createSite, null);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="domain">Domain</Label>
        <div className="flex">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
            https://
          </span>
          <Input
            id="domain"
            name="domain"
            placeholder="example.com"
            className="rounded-l-none"
            defaultValue={state?.fields?.domain}
            autoFocus
          />
        </div>
        <p className="text-xs text-slate-500">
          Just the domain — no www, paths or protocol needed.
        </p>
        <FieldError messages={state?.errors?.domain} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Display name (optional)</Label>
        <Input id="name" name="name" placeholder="My blog" defaultValue={state?.fields?.name} />
        <FieldError messages={state?.errors?.name} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add website"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { register } from "../actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" defaultValue={state?.fields?.name} />
        <FieldError messages={state?.errors?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.fields?.email}
        />
        <FieldError messages={state?.errors?.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
        <FieldError messages={state?.errors?.password} />
        <p className="text-xs text-slate-500">At least 8 characters with a letter and a number.</p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

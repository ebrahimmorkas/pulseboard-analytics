"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

/** Submit button that disables itself while its parent form's action is pending. */
export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
  formAction,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      formAction={formAction}
    >
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

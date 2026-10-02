import { z } from "zod";

const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: emailField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[a-zA-Z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

/** Shape returned by form server actions and consumed by `useActionState`. */
export type FormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  fields?: Record<string, string>;
  success?: boolean;
} | null;

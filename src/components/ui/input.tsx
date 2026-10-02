import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(fieldClasses, "h-10 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />;
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-red-600">{messages[0]}</p>;
}

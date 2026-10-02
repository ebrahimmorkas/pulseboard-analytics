import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Validated against the database, so a stale cookie never causes a redirect loop.
  if (await getCurrentUser()) redirect("/sites");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-slate-900">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Activity className="size-6" aria-hidden />
        </span>
        Pulseboard
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}

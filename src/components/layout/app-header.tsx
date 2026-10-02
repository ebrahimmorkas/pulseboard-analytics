import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth/session";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/sites" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Activity className="size-4" aria-hidden />
            </span>
            Pulseboard
          </Link>
          <nav className="text-sm font-medium text-slate-600">
            <Link href="/sites" className="hover:text-slate-900">
              Sites
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-600 sm:inline">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

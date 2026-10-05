import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Lock, Plus, Settings, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { listSites } from "@/lib/queries/sites";
import { compactNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage() {
  const user = await requireUser("/sites");
  const sites = await listSites(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your websites</h1>
          <p className="mt-1 text-slate-600">Pick a site to open its dashboard.</p>
        </div>
        <Link href="/sites/new" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden /> Add website
        </Link>
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No websites yet"
          description="Add a website to start collecting privacy-friendly analytics."
          action={
            <Link href="/sites/new" className={buttonVariants()}>
              Add your first website
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <Link
                href={`/sites/${site.id}`}
                className="absolute inset-0"
                aria-label={`Open ${site.name}`}
              />
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://icons.duckduckgo.com/ip3/${site.domain}.ico`}
                    alt=""
                    className="size-6 rounded"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{site.name}</p>
                    <p className="truncate text-sm text-slate-500">{site.domain}</p>
                  </div>
                </div>
                <Link
                  href={`/sites/${site.id}/settings`}
                  className="relative rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Settings for ${site.name}`}
                >
                  <Settings className="size-4" />
                </Link>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <Users className="size-4 text-brand-600" aria-hidden />
                  <strong>{compactNumber(site.visitors24h)}</strong> visitors in 24h
                </span>
                {!site.isPublic && <Lock className="size-4 text-slate-400" aria-label="Private" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

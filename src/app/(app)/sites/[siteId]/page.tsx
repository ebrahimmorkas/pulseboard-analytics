import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { z } from "zod";
import { Dashboard } from "@/components/dashboard/dashboard";
import { requireUser } from "@/lib/auth/guards";
import { getOwnedSite } from "@/lib/queries/sites";
import { parseFilters, parsePeriod } from "@/lib/stats/period";

export const metadata: Metadata = { title: "Dashboard" };

export default async function SiteDashboardPage(props: PageProps<"/sites/[siteId]">) {
  const { siteId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireUser(`/sites/${siteId}`);
  const site = z.uuid().safeParse(siteId).success ? await getOwnedSite(siteId, user.id) : null;
  if (!site) notFound();

  return (
    <Dashboard
      siteId={site.id}
      basePath={`/sites/${site.id}`}
      period={parsePeriod(searchParams.period)}
      filters={parseFilters(searchParams)}
      headerSlot={
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
            <p className="text-sm text-slate-500">{site.domain}</p>
          </div>
          <Link
            href={`/sites/${site.id}/settings`}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Site settings"
          >
            <Settings className="size-5" />
          </Link>
        </div>
      }
    />
  );
}

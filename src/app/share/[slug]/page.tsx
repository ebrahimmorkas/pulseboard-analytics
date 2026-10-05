import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity } from "lucide-react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { LiveVisitors } from "@/components/dashboard/live-visitors";
import { getPublicSite } from "@/lib/queries/sites";
import { parseFilters, parsePeriod } from "@/lib/stats/period";

export async function generateMetadata(props: PageProps<"/share/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const site = await getPublicSite(slug);
  if (!site) return { title: "Dashboard not found" };
  return {
    title: `${site.name} analytics`,
    description: `Public traffic statistics for ${site.domain}, powered by Pulseboard.`,
  };
}

/** Read-only dashboard for sites whose owner enabled public sharing. */
export default async function SharedDashboardPage(props: PageProps<"/share/[slug]">) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const site = await getPublicSite(slug);
  if (!site) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Activity className="size-4" aria-hidden />
            </span>
            Pulseboard
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Public dashboard
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Dashboard
          siteId={site.id}
          basePath={`/share/${site.shareSlug}`}
          period={parsePeriod(searchParams.period)}
          filters={parseFilters(searchParams)}
          headerSlot={
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
                <p className="text-sm text-slate-500">{site.domain}</p>
              </div>
              <LiveVisitors siteId={site.id} share={site.shareSlug} />
            </div>
          }
        />
      </main>
    </div>
  );
}

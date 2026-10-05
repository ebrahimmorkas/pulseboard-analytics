import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, PartyPopper } from "lucide-react";
import { z } from "zod";
import { ConfirmDelete } from "@/components/sites/confirm-delete";
import { CopyButton } from "@/components/sites/copy-button";
import { PublicToggle } from "@/components/sites/public-toggle";
import { SiteSettingsForm } from "@/components/sites/site-settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { getOwnedSite } from "@/lib/queries/sites";
import { deleteSite, regenerateShareLink, updateSite } from "../../actions";

export const metadata: Metadata = { title: "Site settings" };

export default async function SiteSettingsPage(props: PageProps<"/sites/[siteId]/settings">) {
  const { siteId } = await props.params;
  const { created } = await props.searchParams;
  const user = await requireUser();
  const site = z.uuid().safeParse(siteId).success ? await getOwnedSite(siteId, user.id) : null;
  if (!site) notFound();

  const snippet = `<script defer data-site="${site.id}" src="${env.NEXT_PUBLIC_APP_URL}/script.js"></script>`;
  const customEvent = `window.pulseboard("Signup", { plan: "pro" });`;
  const shareUrl = `${env.NEXT_PUBLIC_APP_URL}/share/${site.shareSlug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/sites/${site.id}`}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="size-4" aria-hidden /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-slate-900">{site.name}</h1>

      {created && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <PartyPopper className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong>{site.domain}</strong> was added. Paste the snippet below into your site and
            visits will appear on the dashboard within seconds.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tracking snippet</CardTitle>
          <CardDescription>
            Add this to the &lt;head&gt; of every page. It is under 1 KB, sets no cookies and tracks
            single-page app navigations automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
            <code>{snippet}</code>
          </pre>
          <CopyButton value={snippet} label="Copy snippet" />
          <div className="border-t border-slate-100 pt-4 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Custom events (goals)</p>
            <p className="mt-1">Track conversions such as sign-ups or purchases from your code:</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-3 text-slate-800">
              <code>{customEvent}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Domain: {site.domain}</CardDescription>
        </CardHeader>
        <CardContent>
          <SiteSettingsForm action={updateSite.bind(null, site.id)} name={site.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Public dashboard</CardTitle>
              <CardDescription>
                Let anyone with the link view this site&apos;s stats.
              </CardDescription>
            </div>
            <PublicToggle siteId={site.id} isPublic={site.isPublic} />
          </div>
        </CardHeader>
        {site.isPublic && (
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                {shareUrl}
              </code>
              <CopyButton value={shareUrl} />
            </div>
            <form action={regenerateShareLink.bind(null, site.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Generate a new link (revokes the old one)
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Danger zone</CardTitle>
          <CardDescription>
            Deleting a site permanently removes all of its analytics data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDelete label="Delete site" onConfirm={deleteSite.bind(null, site.id)} />
        </CardContent>
      </Card>
    </div>
  );
}

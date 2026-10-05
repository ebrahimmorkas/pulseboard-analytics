import type { Metadata } from "next";
import { NewSiteForm } from "@/components/sites/new-site-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Add website" };

export default async function NewSitePage(props: PageProps<"/sites/new">) {
  const { welcome } = await props.searchParams;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="text-2xl">
          {welcome ? "Welcome! Let's add your first website" : "Add a website"}
        </CardTitle>
        <CardDescription>
          You will get a tracking snippet to paste into your site&apos;s &lt;head&gt;.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NewSiteForm />
      </CardContent>
    </Card>
  );
}

import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Sites" };

export default function SitesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Your websites</h1>
      <EmptyState
        icon={Globe}
        title="No websites yet"
        description="Add a website to start collecting privacy-friendly analytics."
      />
    </div>
  );
}

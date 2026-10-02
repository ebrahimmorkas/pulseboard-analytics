import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Cookie, Gauge, Globe, LineChart, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

const features = [
  {
    icon: Cookie,
    title: "No cookies",
    text: "Anonymous, daily-rotating visitor IDs. No consent banner needed.",
  },
  {
    icon: Gauge,
    title: "Under 1 KB script",
    text: "A tiny, dependency-free tracker that never slows your site down.",
  },
  { icon: Activity, title: "Real-time", text: "See how many people are on your site right now." },
  {
    icon: LineChart,
    title: "Clear metrics",
    text: "Visitors, pageviews, bounce rate and visit duration at a glance.",
  },
  {
    icon: Globe,
    title: "Sources & locations",
    text: "Know where visitors come from and what they read.",
  },
  {
    icon: ShieldCheck,
    title: "You own the data",
    text: "Self-host it with Docker and PostgreSQL.",
  },
];

export default async function LandingPage() {
  if (await getCurrentUser()) redirect("/sites");

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Activity className="size-5" aria-hidden />
          </span>
          Pulseboard
        </Link>
        <nav className="flex gap-2">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/register" className={buttonVariants()}>
            Start free
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700 uppercase">
            Privacy-first analytics
          </span>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Understand your traffic without tracking your visitors
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Add one script tag and get a beautiful, real-time dashboard. No cookies, no personal
            data, no bloat.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Add your website
            </Link>
            <Link href="/share/demo" className={buttonVariants({ size: "lg", variant: "outline" })}>
              View live demo
            </Link>
          </div>
        </section>

        <section className="bg-slate-50 py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <Icon className="size-6 text-brand-600" aria-hidden />
                <h2 className="mt-4 font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

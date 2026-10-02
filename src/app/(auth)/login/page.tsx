import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-600">Log in to see your dashboards.</p>
      <div className="mt-6">
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to Pulseboard?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

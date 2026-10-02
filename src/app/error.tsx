"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-32 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-3 text-slate-600">An unexpected error occurred. Please try again.</p>
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

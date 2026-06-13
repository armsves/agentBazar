"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  SpinnerIcon,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";

const LOAD_TIMEOUT_MS = 12_000;

/**
 * Shows a spinner while Dynamic SDK loads, then a clear CORS/setup error
 * instead of spinning forever when initialization fails.
 */
export default function DynamicSdkGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sdkHasLoaded } = useDynamicContext();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (sdkHasLoaded) {
      setTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [sdkHasLoaded]);

  if (sdkHasLoaded) {
    return <>{children}</>;
  }

  if (timedOut) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "your-app-url";

    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-sm">
        <div className="mb-2 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4" />
          Dynamic wallet SDK failed to load
        </div>
        <p className="text-muted-foreground mb-3">
          The app is blocked by Dynamic CORS for this origin. Add it in the
          Dynamic dashboard under{" "}
          <strong>Settings → Security → Allowed CORS Origins</strong>:
        </p>
        <code className="bg-muted block rounded-md px-3 py-2 text-xs">
          {origin}
        </code>
        <p className="text-muted-foreground mt-3 text-xs">
          For local dev use <code>http://localhost:3000</code>. For Vercel use{" "}
          <code>https://agent-bazar-eight.vercel.app</code> or{" "}
          <code>https://agent-bazar-*.vercel.app</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <SpinnerIcon className="text-dynamic h-10 w-10 animate-spin" />
    </div>
  );
}

"use client";

import { useCallback, useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

import { fetchAndStoreNonce, getNonce } from "@/lib/dynamic/nonce";

/**
 * Keeps a fresh Dynamic auth nonce available before wallet verify runs.
 * The SDK consumes the nonce once per verify and does not refetch when the
 * user switches networks on the "network not supported" screen.
 */
export default function DynamicNonceGuard() {
  const { sdkHasLoaded, user } = useDynamicContext();

  const ensureNonce = useCallback(async () => {
    if (!sdkHasLoaded || user) return;
    if (getNonce()) return;
    await fetchAndStoreNonce();
  }, [sdkHasLoaded, user]);

  useEffect(() => {
    void ensureNonce();
  }, [ensureNonce]);

  useEffect(() => {
    if (!sdkHasLoaded || user) return;

    const interval = window.setInterval(() => {
      void ensureNonce();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [ensureNonce, sdkHasLoaded, user]);

  return null;
}

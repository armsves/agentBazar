"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { Button } from "@/components/ui/button";
import { clearLocalDelegationState } from "@/lib/dynamic/delegation/sessionDelegation";

/**
 * Logout button for the navigation header
 *
 * A client component that handles user logout via Dynamic's SDK.
 * Only renders when a user is logged in. Extracted to its own component
 * to keep the Header component as a server component.
 */
export default function LogoutButton() {
  const { user, handleLogOut } = useDynamicContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Wait for client mount so SSR (no user) matches the first client paint.
  if (!mounted || !user) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        clearLocalDelegationState();
        handleLogOut();
      }}
      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
    >
      Log Out
    </Button>
  );
}

import DelegatedAccess from "@/components/dynamic/delegated-access";
import LpMint from "@/components/mint/lp-mint";
import DelegationHero from "@/components/info/delegation-hero";
import DelegationSteps from "@/components/info/delegation-steps";
import DelegationUseCases from "@/components/info/delegation-use-cases";
import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Main() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-8 pt-16">
      <DelegationHero />
      <div className="bg-primary/5 border-primary/20 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Store className="size-5" />
          Agent Marketplace
        </h2>
        <p className="text-muted-foreground text-sm">
          Install Uniswap v3/v4 LP agents with spend caps and contract
          allowlists. Agents sign via your delegated embedded wallet — no
          server private keys.
        </p>
        <Button asChild className="w-fit">
          <Link href="/agents">Browse agents</Link>
        </Button>
      </div>
      <DelegationSteps />
      <DelegatedAccess />
      <LpMint />
      <DelegationUseCases />
    </div>
  );
}
